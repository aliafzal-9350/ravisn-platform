<?php

namespace App\Jobs;

use App\Events\MessageCreatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use App\Services\AI\AiJobQueue;
use App\Services\Inbox\InboundChannelResolver;
use App\Services\Meta\WebhookEventDeduplicator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class PushInboundToAiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public array $payload,
        public ?string $dedupKey = null
    ) {}

    /**
     * If processing fails, free the dedup claim so Meta's retry of this event
     * is processed instead of being dropped as a duplicate.
     */
    public function failed(\Throwable $exception): void
    {
        app(WebhookEventDeduplicator::class)->release($this->dedupKey);
    }

    /**
     * The tenant's Prompt Tuning settings, sent with each AI task so the agent
     * answers in the tenant's own voice.
     *
     * @return array<string, mixed>
     */
    protected function aiConfig(?string $tenantId, Contact $contact): array
    {
        $tenant = $tenantId ? Tenant::find($tenantId) : null;

        return array_filter([
            ...($tenant?->aiConfig() ?? []),
            'contact_name' => $contact->name,
        ], fn ($value) => $value !== null && $value !== '');
    }

    /**
     * The workspace-wide AI switch ("pure manual" strategy) overrides every
     * thread: when it is off, no message is ever queued for an AI reply.
     */
    protected function tenantAllowsAi(?string $tenantId): bool
    {
        $tenant = $tenantId ? Tenant::find($tenantId) : null;

        return $tenant === null || $tenant->aiRepliesEnabled();
    }

    public function handle(): void
    {
        $entry = $this->payload['entry'][0] ?? null;
        if (! $entry) {
            return;
        }

        // 0. WhatsApp Message Status Updates (sent, delivered, read)
        if (isset($entry['changes'][0]['value']['statuses'])) {
            $statuses = $entry['changes'][0]['value']['statuses'];
            foreach ($statuses as $statusObj) {
                $statusId = $statusObj['id'] ?? null;
                $statusVal = $statusObj['status'] ?? null;
                if (! $statusId || ! $statusVal) {
                    continue;
                }

                $newStatus = match ($statusVal) {
                    'sent' => 'sent',
                    'delivered' => 'delivered',
                    'read' => 'read',
                    'failed' => 'failed',
                    default => null,
                };

                if ($newStatus) {
                    $msg = Message::where('external_message_id', $statusId)->first();
                    if ($msg) {
                        $msg->update(['status' => $newStatus]);
                        $tenantId = $msg->thread?->tenantId() ?? $msg->contact?->tenant_id;

                        // Broadcast to Reverb
                        MessageStatusUpdatedEvent::dispatch(
                            (string) $msg->id,
                            (string) $msg->thread_id,
                            $newStatus,
                            $tenantId ? (string) $tenantId : null
                        );

                        // Publish to Redis
                        try {
                            Redis::connection('bridge')->publish(
                                config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                                json_encode([
                                    'event' => 'MessageStatusUpdated',
                                    'thread_id' => (string) $msg->thread_id,
                                    'message_id' => (string) $msg->id,
                                    'status' => $newStatus,
                                    'tenant_id' => $tenantId ? (string) $tenantId : null,
                                ])
                            );
                        } catch (\Throwable $e) {
                            Log::warning('[PushInboundToAiJob] Redis status broadcast skipped: ' . $e->getMessage());
                        }
                    }
                }
            }
        }

        // 1. WhatsApp Inbound Messages
        if (isset($entry['changes'][0]['value']['messages'][0])) {
            $change = $entry['changes'][0]['value'];
            $metadata = $change['metadata'] ?? [];
            $rawMsg = $change['messages'][0];
            $senderPhone = $rawMsg['from'];
            $phoneId = $metadata['phone_number_id'] ?? null;

            $channel = app(InboundChannelResolver::class)->resolve('whatsapp', $phoneId);
            if (! $channel) {
                return;
            }

            DB::transaction(function () use ($channel, $senderPhone, $rawMsg) {
                // Idempotency guard: never process the same inbound message twice,
                // even if the Redis dedup claim was lost or Meta retried much later.
                if (! empty($rawMsg['id']) && Message::where('external_message_id', $rawMsg['id'])->where('direction', 'inbound')->exists()) {
                    Log::info('[PushInboundToAiJob] Inbound message already processed, skipping: '.$rawMsg['id']);

                    return;
                }

                $tenantId = $channel->tenant_id ? (string) $channel->tenant_id : null;

                $contact = Contact::query()
                    ->when($tenantId, fn ($query) => $query->where('tenant_id', $tenantId))
                    ->where(fn ($query) => $query->where('phone_number', $senderPhone)->orWhere('phone', $senderPhone))
                    ->first();

                if (! $contact) {
                    $contact = Contact::create([
                        'tenant_id' => $tenantId,
                        'phone_number' => $senderPhone,
                        'phone' => $senderPhone,
                        'first_name' => $rawMsg['profile']['name'] ?? 'WhatsApp User',
                    ]);
                }

                $thread = Thread::firstOrCreate(
                    [
                        'contact_id' => $contact->id,
                        'channel_identity_id' => $channel->id,
                    ],
                    [
                        'channel_type' => 'whatsapp',
                        'status' => 'open',
                        'bot_active' => true,
                    ]
                );

                $messageType = $rawMsg['type'] ?? 'text';
                $content = null;
                $mediaId = null;
                $mimeType = null;

                if ($messageType === 'text') {
                    $content = $rawMsg['text']['body'] ?? '';
                } elseif (in_array($messageType, ['audio', 'voice'])) {
                    $mediaId = $rawMsg[$messageType]['id'] ?? null;
                    $mimeType = $rawMsg[$messageType]['mime_type'] ?? 'audio/ogg';
                } elseif (in_array($messageType, ['image', 'video', 'document'])) {
                    $mediaId = $rawMsg[$messageType]['id'] ?? null;
                    $mimeType = $rawMsg[$messageType]['mime_type'] ?? null;
                    $content = $rawMsg[$messageType]['caption'] ?? null;
                } elseif ($messageType === 'interactive') {
                    $interactiveType = $rawMsg['interactive']['type'] ?? '';
                    $content = $rawMsg['interactive'][$interactiveType]['title'] ?? $rawMsg['interactive'][$interactiveType]['id'] ?? '';
                }

                $contact->update(['last_inbound_at' => now()]);

                $message = Message::create([
                    'thread_id' => $thread->id,
                    'contact_id' => $contact->id,
                    'direction' => 'inbound',
                    'channel_type' => 'whatsapp',
                    'external_message_id' => $rawMsg['id'] ?? null,
                    'message_type' => $messageType,
                    'content' => $content,
                    'media_url' => $mediaId,
                    'media_mime_type' => $mimeType,
                    'status' => 'received',
                    'raw_payload' => $rawMsg,
                ]);

                $thread->update(['last_message_at' => now()]);

                // Mandatory Opt-Out Logic: Regex check for ^(stop|unsubscribe|cancel)$ (case-insensitive)
                $isOptOut = false;
                if ($messageType === 'text' && is_string($content) && preg_match('/^(stop|unsubscribe|cancel)$/i', trim($content))) {
                    $isOptOut = true;
                    $contact->update(['opted_out' => true]);
                    $thread->update(['bot_active' => false]);

                    // Dispatch an internal system message to the thread ("Customer opted out")
                    $systemMsg = Message::create([
                        'thread_id' => $thread->id,
                        'contact_id' => $contact->id,
                        'direction' => 'outbound',
                        'channel_type' => 'whatsapp',
                        'message_type' => 'text',
                        'content' => 'Customer opted out',
                        'status' => 'delivered',
                        'is_ai_generated' => false,
                        'raw_payload' => ['system' => true, 'action' => 'opt_out'],
                    ]);

                    try {
                        event(new MessageCreatedEvent($systemMsg));
                    } catch (\Throwable $e) {
                        Log::warning('[PushInboundToAiJob] Direct Reverb opt-out broadcast skipped: ' . $e->getMessage());
                    }

                    try {
                        Redis::connection('bridge')->publish(
                            config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                            json_encode([
                                'event' => 'MessageCreated',
                                'thread_id' => (string) $thread->id,
                                'message_id' => (string) $systemMsg->id,
                                'direction' => 'outbound',
                                'channel' => 'whatsapp',
                                'content' => 'Customer opted out',
                                'sender' => 'System',
                                'message' => [
                                    'id' => (string) $systemMsg->id,
                                    'thread_id' => (string) $thread->id,
                                    'contact_id' => (string) $contact->id,
                                    'direction' => 'outbound',
                                    'channel_type' => 'whatsapp',
                                    'content' => 'Customer opted out',
                                    'is_ai_generated' => false,
                                    'status' => 'delivered',
                                    'created_at' => $systemMsg->created_at->toISOString(),
                                ]
                            ])
                        );
                    } catch (\Throwable $e) {
                        Log::warning('[PushInboundToAiJob] Opt-out broadcast skipped: ' . $e->getMessage());
                    }
                }

                // Notify CRM UI in real-time
                try {
                    event(new MessageCreatedEvent($message));
                } catch (\Throwable $e) {
                    Log::warning('[PushInboundToAiJob] Direct Reverb inbound broadcast skipped: ' . $e->getMessage());
                }

                try {
                    Redis::connection('bridge')->publish(
                        config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                        json_encode([
                            'event' => 'MessageCreated',
                            'thread_id' => (string) $thread->id,
                            'message_id' => (string) $message->id,
                            'direction' => 'inbound',
                            'channel' => 'whatsapp',
                            'content' => $content,
                            'sender' => $contact->full_name,
                            'message' => [
                                'id' => (string) $message->id,
                                'thread_id' => (string) $thread->id,
                                'contact_id' => (string) $contact->id,
                                'direction' => 'inbound',
                                'channel_type' => 'whatsapp',
                                'content' => $content,
                                'is_ai_generated' => false,
                                'status' => 'received',
                                'created_at' => $message->created_at->toISOString(),
                            ]
                        ])
                    );
                } catch (\Throwable $e) {
                    Log::warning('[PushInboundToAiJob] Redis Pub/Sub broadcast skipped: ' . $e->getMessage());
                }

                // Task 3.1: Human Takeover Sentiment Trigger
                $sentimentEngine = app(\App\Services\AI\AiIntelligenceEngine::class);
                $sentimentEval = $sentimentEngine->evaluate((string) $content, $thread);
                if ($sentimentEval['is_escalated']) {
                    $sentimentEngine->triggerHumanEscalation($thread, $sentimentEval['reason'], $senderPhone);
                }

                // Forward to AI Engine if bot handling is active and customer hasn't opted out and not escalated
                $thread->refresh();
                if ($thread->bot_active && ! $isOptOut && $this->tenantAllowsAi($tenantId)) {
                    $aiJobPayload = json_encode([
                        'event_id' => (string) Str::uuid(),
                        'channel' => 'whatsapp',
                        'channel_identity_id' => (string) $channel->id,
                        'thread_id' => (string) $thread->id,
                        'contact_id' => (string) $contact->id,
                        'message_id' => (string) $message->id,
                        'sender_id' => $senderPhone,
                        'message_type' => $messageType,
                        'content' => $content,
                        'media_id' => $mediaId,
                        'mime_type' => $mimeType,
                        // The agent loads the (encrypted) channel token itself; the
                        // queue never carries a usable Meta credential.
                        'tenant_id' => $tenantId,
                        'ai_config' => $this->aiConfig($tenantId, $contact),
                        'timestamp' => now()->toISOString(),
                    ]);

                    app(AiJobQueue::class)->push($aiJobPayload);
                    Log::info("[PushInboundToAiJob] Queued AI task for thread {$thread->id}");
                }
            });
        }

        // 2. Messenger / Instagram Messaging Events
        if (isset($entry['messaging'][0])) {
            $msgEvent = $entry['messaging'][0];
            $senderId = $msgEvent['sender']['id'] ?? null;
            $recipientId = $msgEvent['recipient']['id'] ?? null;
            // Meta labels the delivery itself: object "instagram" or "page".
            // (entry.id is a numeric account id, so it cannot tell them apart.)
            $channelType = ($this->payload['object'] ?? null) === 'instagram' ? 'instagram' : 'messenger';

            $channel = app(InboundChannelResolver::class)->resolve($channelType, $recipientId);
            if (! $channel) {
                return;
            }

            if (isset($msgEvent['message'])) {
                DB::transaction(function () use ($channel, $senderId, $msgEvent, $channelType) {
                    if (! empty($msgEvent['message']['mid']) && Message::where('external_message_id', $msgEvent['message']['mid'])->where('direction', 'inbound')->exists()) {
                        Log::info('[PushInboundToAiJob] Inbound message already processed, skipping: '.$msgEvent['message']['mid']);

                        return;
                    }

                    $column = $channelType === 'instagram' ? 'instagram_igsid' : 'messenger_psid';
                    $tenantId = $channel->tenant_id ? (string) $channel->tenant_id : null;
                    $contact = Contact::firstOrCreate(
                        [$column => $senderId, 'tenant_id' => $tenantId],
                        ['first_name' => ucfirst($channelType) . ' User']
                    );

                    $thread = Thread::firstOrCreate(
                        [
                            'contact_id' => $contact->id,
                            'channel_identity_id' => $channel->id,
                        ],
                        [
                            'channel_type' => $channelType,
                            'status' => 'open',
                            'bot_active' => true,
                        ]
                    );

                    $contact->update(['last_inbound_at' => now()]);

                    $content = $msgEvent['message']['text'] ?? null;
                    $message = Message::create([
                        'thread_id' => $thread->id,
                        'contact_id' => $contact->id,
                        'direction' => 'inbound',
                        'channel_type' => $channelType,
                        'external_message_id' => $msgEvent['message']['mid'] ?? null,
                        'message_type' => 'text',
                        'content' => $content,
                        'status' => 'received',
                        'raw_payload' => $msgEvent,
                    ]);

                    $thread->update(['last_message_at' => now()]);

                    // Mandatory Opt-Out Logic: Regex check for ^(stop|unsubscribe|cancel)$
                    $isOptOut = false;
                    if (is_string($content) && preg_match('/^(stop|unsubscribe|cancel)$/i', trim($content))) {
                        $isOptOut = true;
                        $contact->update(['opted_out' => true]);
                        $thread->update(['bot_active' => false]);

                        $systemMsg = Message::create([
                            'thread_id' => $thread->id,
                            'contact_id' => $contact->id,
                            'direction' => 'outbound',
                            'channel_type' => $channelType,
                            'message_type' => 'text',
                            'content' => 'Customer opted out',
                            'status' => 'delivered',
                            'is_ai_generated' => false,
                            'raw_payload' => ['system' => true, 'action' => 'opt_out'],
                        ]);

                        try {
                            event(new MessageCreatedEvent($systemMsg));
                        } catch (\Throwable $e) {
                            Log::warning('[PushInboundToAiJob] Direct Reverb opt-out broadcast skipped: ' . $e->getMessage());
                        }

                        try {
                            Redis::connection('bridge')->publish(
                                config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                                json_encode([
                                    'event' => 'MessageCreated',
                                    'thread_id' => (string) $thread->id,
                                    'message_id' => (string) $systemMsg->id,
                                    'direction' => 'outbound',
                                    'channel' => $channelType,
                                    'content' => 'Customer opted out',
                                    'sender' => 'System',
                                    'message' => [
                                        'id' => (string) $systemMsg->id,
                                        'thread_id' => (string) $thread->id,
                                        'contact_id' => (string) $contact->id,
                                        'direction' => 'outbound',
                                        'channel_type' => $channelType,
                                        'content' => 'Customer opted out',
                                        'is_ai_generated' => false,
                                        'status' => 'delivered',
                                        'created_at' => $systemMsg->created_at->toISOString(),
                                    ]
                                ])
                            );
                        } catch (\Throwable $e) {
                            Log::warning('[PushInboundToAiJob] Opt-out broadcast skipped: ' . $e->getMessage());
                        }
                    }

                    // Notify CRM UI in real-time
                    try {
                        event(new MessageCreatedEvent($message));
                    } catch (\Throwable $e) {
                        Log::warning('[PushInboundToAiJob] Direct Reverb inbound broadcast skipped: ' . $e->getMessage());
                    }

                    try {
                        Redis::connection('bridge')->publish(
                            config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                            json_encode([
                                'event' => 'MessageCreated',
                                'thread_id' => (string) $thread->id,
                                'message_id' => (string) $message->id,
                                'direction' => 'inbound',
                                'channel' => $channelType,
                                'content' => $content,
                                'sender' => $contact->full_name,
                                'message' => [
                                    'id' => (string) $message->id,
                                    'thread_id' => (string) $thread->id,
                                    'contact_id' => (string) $contact->id,
                                    'direction' => 'inbound',
                                    'channel_type' => $channelType,
                                    'content' => $content,
                                    'is_ai_generated' => false,
                                    'status' => 'received',
                                    'created_at' => $message->created_at->toISOString(),
                                ]
                            ])
                        );
                    } catch (\Throwable $e) {
                        Log::warning('[PushInboundToAiJob] Redis Pub/Sub broadcast skipped: ' . $e->getMessage());
                    }

                    // Task 3.1: Human Takeover Sentiment Trigger
                    $sentimentEngine = app(\App\Services\AI\AiIntelligenceEngine::class);
                    $sentimentEval = $sentimentEngine->evaluate((string) $content, $thread);
                    if ($sentimentEval['is_escalated']) {
                        $sentimentEngine->triggerHumanEscalation($thread, $sentimentEval['reason'], $senderId);
                    }

                    $thread->refresh();
                    if ($thread->bot_active && ! $isOptOut && $this->tenantAllowsAi($tenantId)) {
                        $aiJobPayload = json_encode([
                            'event_id' => (string) Str::uuid(),
                            'channel' => $channelType,
                            'channel_identity_id' => (string) $channel->id,
                            'thread_id' => (string) $thread->id,
                            'contact_id' => (string) $contact->id,
                            'message_id' => (string) $message->id,
                            'sender_id' => $senderId,
                            'message_type' => 'text',
                            'content' => $content,
                            'media_id' => null,
                            'tenant_id' => $tenantId,
                            'ai_config' => $this->aiConfig($tenantId, $contact),
                            'timestamp' => now()->toISOString(),
                        ]);

                        app(AiJobQueue::class)->push($aiJobPayload);
                    }
                });
            }
        }
    }
}
