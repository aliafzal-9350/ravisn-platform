<?php

namespace App\Jobs;

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Thread;
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
        public array $payload
    ) {}

    public function handle(): void
    {
        $entry = $this->payload['entry'][0] ?? null;
        if (! $entry) {
            return;
        }

        // 1. WhatsApp Inbound Messages
        if (isset($entry['changes'][0]['value']['messages'][0])) {
            $change = $entry['changes'][0]['value'];
            $metadata = $change['metadata'] ?? [];
            $rawMsg = $change['messages'][0];
            $senderPhone = $rawMsg['from'];
            $phoneId = $metadata['phone_number_id'] ?? null;

            $channel = ChannelIdentity::where('external_id', $phoneId)->first();
            if (! $channel) {
                // Fallback / Auto-register default channel if not exists
                $channel = ChannelIdentity::firstOrCreate(
                    ['external_id' => $phoneId ?: 'default_whatsapp'],
                    [
                        'channel_type' => 'whatsapp',
                        'account_name' => 'Primary WhatsApp Channel',
                        'access_token' => config('services.meta.whatsapp_system_token', env('WHATSAPP_SYSTEM_USER_ACCESS_TOKEN', 'token')),
                        'webhook_verify_token' => config('services.meta.webhook_verify_token', env('META_WEBHOOK_VERIFY_TOKEN', 'token')),
                        'is_active' => true,
                    ]
                );
            }

            DB::transaction(function () use ($channel, $senderPhone, $rawMsg) {
                $contact = Contact::where('phone_number', $senderPhone)
                    ->orWhere('phone', $senderPhone)
                    ->first();

                if (! $contact) {
                    $contact = Contact::create([
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

                // Notify CRM UI in real-time
                try {
                    Redis::publish(
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

                // Forward to AI Engine if bot handling is active
                if ($thread->bot_active) {
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
                        'access_token' => $channel->access_token,
                        'timestamp' => now()->toISOString(),
                    ]);

                    $streamKey = config('services.meta.inbound_ai_stream_key', env('INBOUND_AI_STREAM_KEY', 'inbound_ai_jobs'));
                    Redis::rpush($streamKey, $aiJobPayload);
                    Log::info("[PushInboundToAiJob] Queued AI Task to Redis [{$streamKey}] for Thread {$thread->id}");
                }
            });
        }

        // 2. Messenger / Instagram Messaging Events
        if (isset($entry['messaging'][0])) {
            $msgEvent = $entry['messaging'][0];
            $senderId = $msgEvent['sender']['id'] ?? null;
            $recipientId = $msgEvent['recipient']['id'] ?? null;
            $channelType = isset($entry['id']) && str_starts_with($entry['id'], 'instagram') ? 'instagram' : 'messenger';

            $channel = ChannelIdentity::where('external_id', $recipientId)->first();
            if (! $channel) {
                $channel = ChannelIdentity::firstOrCreate(
                    ['external_id' => $recipientId ?: 'default_page'],
                    [
                        'channel_type' => $channelType,
                        'account_name' => ucfirst($channelType) . ' Channel',
                        'access_token' => env('FACEBOOK_PAGE_ACCESS_TOKEN', 'token'),
                        'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN', 'token'),
                        'is_active' => true,
                    ]
                );
            }

            if (isset($msgEvent['message'])) {
                DB::transaction(function () use ($channel, $senderId, $msgEvent, $channelType) {
                    $column = $channelType === 'instagram' ? 'instagram_igsid' : 'messenger_psid';
                    $contact = Contact::firstOrCreate(
                        [$column => $senderId],
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

                    // Notify CRM UI in real-time
                    try {
                        Redis::publish(
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

                    if ($thread->bot_active) {
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
                            'access_token' => $channel->access_token,
                            'timestamp' => now()->toISOString(),
                        ]);

                        $streamKey = config('services.meta.inbound_ai_stream_key', env('INBOUND_AI_STREAM_KEY', 'inbound_ai_jobs'));
                        Redis::rpush($streamKey, $aiJobPayload);
                    }
                });
            }
        }
    }
}
