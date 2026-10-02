<?php

namespace App\Services\WhatsApp;

use App\Events\MessageStatusUpdatedEvent;
use App\Jobs\SendOutgoingWebhook;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Message;
use App\Models\SystemNotification;
use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WhatsappMessage;
use App\Services\AI\RavisnAiService;
use App\Services\Automation\ConditionEvaluator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class WebhookHandler
{
    /**
     * Verify a webhook subscription request from Meta.
     *
     * @return array{verified: bool, challenge: string|null}
     */
    public function verifySubscription(Request $request, ?string $tenantToken = null): array
    {
        $mode = $request->query('hub_mode');
        $challenge = $request->query('hub_challenge');

        if ($tenantToken) {
            $tenant = Tenant::where('webhook_token', $tenantToken)->first();
            if (! $tenant) {
                Log::warning('Webhook verification failed: Invalid tenant token', ['tenant_token' => $tenantToken]);

                return ['verified' => false, 'challenge' => null];
            }

            if ($mode === 'subscribe') {
                return ['verified' => true, 'challenge' => $challenge];
            }
        }

        return ['verified' => false, 'challenge' => null];
    }

    /**
     * Validate the webhook signature from Meta.
     */
    public function isValidSignature(Request $request, ?string $tenantToken = null): bool
    {
        $signature = $request->header('X-Hub-Signature-256');

        if (! $signature) {
            return false;
        }

        $appSecret = null;

        if ($tenantToken) {
            $tenant = Tenant::where('webhook_token', $tenantToken)->first();
            if ($tenant) {
                $account = $tenant->whatsappAccounts()->whereNotNull('app_secret')->first();
                if ($account) {
                    $appSecret = $account->app_secret;
                }
            }
        }

        if (! $appSecret) {
            $appSecret = config('whatsapp.app_secret');
        }

        if (! $appSecret) {
            Log::error('WhatsApp app secret not configured');

            return false;
        }

        $expectedSignature = 'sha256='.hash_hmac('sha256', $request->getContent(), $appSecret);

        $match = hash_equals($expectedSignature, $signature);

        if (! $match) {
            Log::warning('WhatsApp Webhook signature mismatch');
        }

        return $match;
    }

    /**
     * Process incoming webhook payload.
     *
     * @param  array<string, mixed>  $payload
     */
    public function handle(array $payload): void
    {
        $entries = $payload['entry'] ?? [];

        foreach ($entries as $entry) {
            $changes = $entry['changes'] ?? [];

            foreach ($changes as $change) {
                $field = $change['field'] ?? '';
                $value = $change['value'] ?? [];

                if ($field === 'messages') {
                    $this->handleMessageStatuses($value);
                    $this->handleIncomingMessages($value);
                } elseif ($field === 'phone_number_quality_update') {
                    $this->handlePhoneNumberQualityUpdate($value);
                }
            }
        }
    }

    protected function handlePhoneNumberQualityUpdate(array $value): void
    {
        $phoneNumberId = $value['phone_number_id'] ?? null;
        $newRating = strtoupper($value['new_quality_rating'] ?? $value['current_limit'] ?? '');

        if (! $phoneNumberId || ! $newRating) {
            return;
        }

        $account = WhatsappAccount::where('phone_number_id', $phoneNumberId)->first();
        if ($account) {
            $oldRating = $account->quality_rating;
            $account->update(['quality_rating' => $newRating]);
            if (in_array($newRating, ['RED', 'YELLOW'])) {
                $type = $newRating === 'RED' ? 'error' : 'warning';
                $title = $newRating === 'RED' ? 'Critical: Phone number quality dropped to RED' : 'Warning: Phone number quality dropped to YELLOW';
                $message = "Your phone number ({$account->phone_number}) quality changed from {$oldRating} to {$newRating}.";

                SystemNotification::create([
                    'tenant_id' => $account->tenant_id,
                    'title' => $title,
                    'message' => $message,
                    'type' => $type,
                ]);
            }
        }
    }

    /**
     * Process new incoming messages from customer.
     *
     * @param  array<string, mixed>  $value
     */
    protected function handleIncomingMessages(array $value): void
    {
        $metadata = $value['metadata'] ?? [];
        $phoneNumberId = $metadata['phone_number_id'] ?? null;

        if (! $phoneNumberId) {
            return;
        }

        $account = WhatsappAccount::where('phone_number_id', $phoneNumberId)->first();
        if (! $account) {
            Log::warning('Webhook received for unknown phone_number_id', ['phone_number_id' => $phoneNumberId]);

            return;
        }

        $tenant = $account->tenant;
        $messages = $value['messages'] ?? [];
        $contacts = $value['contacts'] ?? [];

        $contactNames = [];
        foreach ($contacts as $contact) {
            $waId = $contact['wa_id'] ?? null;
            $name = $contact['profile']['name'] ?? null;
            if ($waId && $name) {
                $contactNames[$waId] = $name;
            }
        }

        foreach ($messages as $msg) {
            $from = $msg['from'] ?? null;
            $msgId = $msg['id'] ?? null;
            $timestamp = $msg['timestamp'] ?? null;
            $type = $msg['type'] ?? 'text';

            if (! $from || ! $msgId) {
                continue;
            }

            $customerPhone = $from;
            if ($from && ! str_starts_with($from, '+')) {
                $customerPhone = '+'.preg_replace('/[^0-9]/', '', $from);
            }
            $customerName = $contactNames[$from] ?? null;

            // Resolve contact name if phone number matches a contact
            $contact = Contact::where('tenant_id', $tenant->id)
                ->where('phone', $customerPhone)
                ->first();
            if ($contact) {
                $customerName = $contact->name;
            }

            $chat = $account->chats()->firstOrCreate(
                ['customer_phone' => $customerPhone],
                [
                    'tenant_id' => $tenant->id,
                    'customer_name' => $customerName ?? $customerPhone,
                    'last_message_at' => $timestamp ? now()->setTimestamp((int) $timestamp) : now(),
                ]
            );

            if ($customerName && $chat->customer_name !== $customerName) {
                $chat->update(['customer_name' => $customerName]);
            }

            $body = '';
            if ($type === 'text') {
                $body = $msg['text']['body'] ?? '';
            } elseif ($type === 'button') {
                $body = $msg['button']['text'] ?? '';
            } else {
                $body = "[Unsupported Message: {$type}]";
            }

            $chat->messages()->updateOrCreate(
                ['meta_message_id' => $msgId],
                [
                    'direction' => 'inbound',
                    'message_type' => $type,
                    'body' => $body,
                    'sent_at' => $timestamp ? now()->setTimestamp((int) $timestamp) : now(),
                    'status' => 'delivered',
                ]
            );

            $chat->update(['last_message_at' => now()]);

            // Update contact last_inbound_at
            if ($contact) {
                $contact->update(['last_inbound_at' => now()]);
            } else {
                Contact::where('tenant_id', $tenant->id)
                    ->where('phone', $customerPhone)
                    ->update(['last_inbound_at' => now()]);
            }

            // Mandatory Opt-Out Logic: Regex check for ^(stop|unsubscribe|cancel)$ (case-insensitive)
            $cleanBody = trim(strtolower($body));
            $isOptOut = (bool) preg_match('/^(stop|unsubscribe|cancel)$/i', $cleanBody);

            if ($isOptOut) {
                Contact::where('tenant_id', $tenant->id)
                    ->where('phone', $customerPhone)
                    ->update([
                        'opted_out' => true,
                        'last_inbound_at' => now(),
                    ]);

                // Dispatch internal system message to the thread
                $chat->messages()->create([
                    'meta_message_id' => 'sys_optout_'.bin2hex(random_bytes(8)),
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'body' => 'Customer opted out',
                    'sent_at' => now(),
                    'status' => 'delivered',
                ]);

                $chat->update(['is_ai_active' => false]);
                Log::info('Contact opted out via WhatsApp keyword', ['phone' => $customerPhone]);
            }

            if (! $isOptOut) {
                // Process Automation Flows
                $this->processAutomationFlows($tenant, $customerPhone, $body, $account);

                // Process RAVISN Master AI Automation Engine Directives
                $aiService = app(RavisnAiService::class);
                $aiService->processIncomingMessage($chat, $body);
            }

            // Dispatch outgoing webhooks for the tenant if configured
            $activeWebhooks = $tenant->outgoingWebhooks()->where('is_active', true)->get();
            if ($activeWebhooks->isNotEmpty()) {
                $webhookPayload = [
                    'event' => 'message.received',
                    'timestamp' => now()->toIso8601String(),
                    'tenant_id' => $tenant->id,
                    'CURRENT_ACTIVE_STRATEGY' => $tenant->ai_strategy ?? 'lead_qualifier',
                    'data' => [
                        'message_id' => $msgId,
                        'phone_number_id' => $phoneNumberId,
                        'CURRENT_ACTIVE_STRATEGY' => $tenant->ai_strategy ?? 'lead_qualifier',
                        'sender' => [
                            'name' => $customerName ?? $customerPhone,
                            'phone' => $customerPhone,
                        ],
                        'message' => [
                            'type' => $type,
                            'body' => $body,
                            'received_at' => $timestamp ? now()->setTimestamp((int) $timestamp)->toIso8601String() : now()->toIso8601String(),
                        ],
                    ],
                ];

                foreach ($activeWebhooks as $webhook) {
                    SendOutgoingWebhook::dispatch($webhook, $webhookPayload);
                }
            }
        }
    }

    /**
     * Handle message status updates (sent, delivered, read, failed).
     *
     * @param  array<string, mixed>  $value
     */
    protected function handleMessageStatuses(array $value): void
    {
        $statuses = $value['statuses'] ?? [];

        foreach ($statuses as $status) {
            $messageId = $status['id'] ?? null;
            $statusValue = $status['status'] ?? null;
            $timestamp = $status['timestamp'] ?? null;

            if (! $messageId || ! $statusValue) {
                continue;
            }

            // Update campaign recipient status if applicable
            $recipient = CampaignRecipient::where('whatsapp_message_id', $messageId)->first();

            if ($recipient) {
                $this->updateRecipientStatus($recipient, $statusValue, $timestamp);
            }

            $newStatus = match ($statusValue) {
                'sent' => 'sent',
                'delivered' => 'delivered',
                'read' => 'read',
                'failed' => 'failed',
                default => null,
            };

            // Update legacy WhatsappMessage
            $chatMessage = WhatsappMessage::where('meta_message_id', $messageId)->first();
            if ($chatMessage && $newStatus) {
                $chatMessage->update(['status' => $newStatus]);
            }

            // Update Omnichannel Message model & broadcast read receipt
            if ($newStatus) {
                $omniMessage = Message::where('external_message_id', $messageId)->first();
                if ($omniMessage) {
                    $omniMessage->update(['status' => $newStatus]);
                    $tenantId = $omniMessage->thread?->contact?->tenant_id ?? $omniMessage->contact?->tenant_id;

                    // 1. Broadcast directly to Reverb
                    MessageStatusUpdatedEvent::dispatch(
                        (string) $omniMessage->id,
                        (string) $omniMessage->thread_id,
                        $newStatus,
                        $tenantId ? (string) $tenantId : null
                    );

                    // 2. Publish to Redis Pub/Sub for worker sync
                    try {
                        Redis::publish(
                            config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                            json_encode([
                                'event' => 'MessageStatusUpdated',
                                'thread_id' => (string) $omniMessage->thread_id,
                                'message_id' => (string) $omniMessage->id,
                                'status' => $newStatus,
                                'tenant_id' => $tenantId ? (string) $tenantId : null,
                            ])
                        );
                    } catch (\Throwable $e) {
                        Log::warning('[WebhookHandler] Redis status broadcast skipped: '.$e->getMessage());
                    }
                }
            }
        }
    }

    /**
     * Update a campaign recipient's status based on the webhook event.
     */
    protected function updateRecipientStatus(CampaignRecipient $recipient, string $status, ?string $timestamp): void
    {
        $dateTime = $timestamp ? now()->setTimestamp((int) $timestamp) : now();

        match ($status) {
            'sent' => $recipient->update([
                'status' => 'sent',
                'sent_at' => $dateTime,
            ]),
            'delivered' => $recipient->update([
                'status' => 'delivered',
                'delivered_at' => $dateTime,
            ]),
            'read' => $recipient->update([
                'status' => 'read',
                'read_at' => $dateTime,
            ]),
            'failed' => $this->handleFailedMessage($recipient, $status),
            default => Log::info("Unhandled WhatsApp message status: {$status}", [
                'message_id' => $recipient->whatsapp_message_id,
            ]),
        };

        $this->updateCampaignCounters($recipient);
    }

    /**
     * Handle a failed message status.
     */
    protected function handleFailedMessage(CampaignRecipient $recipient, string $status): void
    {
        $recipient->update([
            'status' => 'failed',
            'error_message' => "Message delivery failed with status: {$status}",
        ]);
    }

    /**
     * Update campaign counters based on recipient statuses.
     */
    protected function updateCampaignCounters(CampaignRecipient $recipient): void
    {
        $campaign = $recipient->campaign;

        if (! $campaign) {
            return;
        }

        $campaign->update([
            'sent_count' => $campaign->recipients()->where('status', 'sent')->count()
                + $campaign->recipients()->where('status', 'delivered')->count()
                + $campaign->recipients()->where('status', 'read')->count(),
            'delivered_count' => $campaign->recipients()->where('status', 'delivered')->count()
                + $campaign->recipients()->where('status', 'read')->count(),
            'read_count' => $campaign->recipients()->where('status', 'read')->count(),
            'failed_count' => $campaign->recipients()->where('status', 'failed')->count(),
        ]);

        // Check if campaign is completed
        $processedCount = $campaign->sent_count + $campaign->failed_count;

        if ($processedCount >= $campaign->total_recipients && $campaign->status === 'processing') {
            $campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Notify if failures occurred
            if ($campaign->failed_count > 0) {
                SystemNotification::create([
                    'tenant_id' => $campaign->tenant_id,
                    'title' => 'Campaign Partial or Total Delivery Failure',
                    'message' => "Campaign \"{$campaign->name}\" with {$campaign->failed_count} messages out of {$campaign->total_recipients}.",
                    'type' => 'error',
                ]);
            }
        }
    }

    protected function processAutomationFlows($tenant, $customerPhone, $body, $account): void
    {
        $messageText = trim($body);
        if (empty($messageText)) {
            return;
        }

        $flows = $tenant->automationFlows()->where('is_active', true)->get();

        foreach ($flows as $flow) {
            // Verify if the incoming message matches the flow's trigger keyword
            $triggerKeyword = trim($flow->trigger_keyword ?? '*');
            $matchType = $flow->trigger_match_type ?? 'contains';

            if ($triggerKeyword !== '*' && $triggerKeyword !== '') {
                $isMatched = false;
                if ($matchType === 'exact') {
                    $isMatched = (strcasecmp($messageText, $triggerKeyword) === 0);
                } else {
                    // contains
                    $isMatched = (mb_stripos($messageText, $triggerKeyword) !== false);
                }

                if (! $isMatched) {
                    continue; // Skip to next flow
                }
            }

            // Durably log the trigger to a Redis Stream and return immediately —
            // ConsumeAutomationTriggers picks it up and starts an async
            // WorkflowEngine run (one queued job per node) instead of running
            // the whole flow synchronously inside this webhook request.
            Redis::xadd('automation_triggers', '*', [
                'flow_id' => (string) $flow->id,
                'tenant_id' => (string) $tenant->id,
                'customer_phone' => $customerPhone,
                'message_text' => $messageText,
                'whatsapp_account_id' => (string) $account->id,
                'triggered_at' => now()->toISOString(),
            ]);
        }
    }

    /**
     * Match conditions against incoming message text.
     *
     * Delegates to ConditionEvaluator, which the async WorkflowEngine/
     * ExecuteWorkflowNodeJob pipeline also uses directly. Kept here as thin
     * protected wrappers so existing tests that exercise these via an
     * anonymous WebhookHandler subclass keep working unchanged.
     */
    protected function automationConditionMatches(array|string|null $action, string $messageText): bool
    {
        return ConditionEvaluator::matches($action, $messageText);
    }

    /**
     * @return array{matched: bool, branch_index: int|null}
     */
    protected function automationConditionOutcome(array $action, string $messageText): array
    {
        return ConditionEvaluator::outcome($action, $messageText);
    }

    /**
     * Match a single condition object or expression string.
     */
    protected function singleConditionMatches(array|string|null $cond, string $messageText): bool
    {
        return ConditionEvaluator::singleMatches($cond, $messageText);
    }
}
