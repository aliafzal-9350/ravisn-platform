<?php

namespace App\Services\WhatsApp;

use App\Jobs\SendOutgoingWebhook;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\SystemNotification;
use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Models\WhatsappMessage;
use App\Services\AI\RavisnAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
            \Illuminate\Support\Facades\Log::warning('Webhook received for unknown phone_number_id', ['phone_number_id' => $phoneNumberId]);
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

            // Auto Opt-Out (STOP / UNSUBSCRIBE) to safeguard Quality Rating
            $cleanBody = trim(strtolower($body));
            if (in_array($cleanBody, ['stop', 'unsubscribe', 'cancel', 'optout', 'opt-out'])) {
                \App\Models\Contact::where('tenant_id', $tenant->id)
                    ->where('phone', $customerPhone)
                    ->update(['is_opted_out' => true]);
                \Illuminate\Support\Facades\Log::info('Contact opted out via WhatsApp keyword', ['phone' => $customerPhone]);
            }

            // Process Automation Flows
            $this->processAutomationFlows($tenant, $customerPhone, $body, $account);

            // Process RAVISN Master AI Automation Engine Directives
            $aiService = app(RavisnAiService::class);
            $aiService->processIncomingMessage($chat, $body);

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

            // Update inbox/chat message status (covers inbox, API, and automation messages)
            $chatMessage = WhatsappMessage::where('meta_message_id', $messageId)->first();

            if ($chatMessage) {
                $newStatus = match ($statusValue) {
                    'sent' => 'sent',
                    'delivered' => 'delivered',
                    'read' => 'read',
                    'failed' => 'failed',
                    default => null,
                };

                if ($newStatus) {
                    $chatMessage->update(['status' => $newStatus]);
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

        // Fetch contact details
        $contact = $tenant->contacts()->where('phone', $customerPhone)->first();
        $customerName = $contact ? $contact->name : $customerPhone;

        $replaceVariables = function ($text) use ($customerName, $customerPhone, $messageText) {
            return str_replace(
                ['{{{senderName}}}', '{{{senderMobile}}}', '{{{senderMessage}}}'],
                [$customerName, $customerPhone, $messageText],
                $text ?? ''
            );
        };

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

            $visualGraph = $flow->visual_graph;
            $actions = $flow->actions ?? [];

            if (is_array($visualGraph) && ! empty($visualGraph['nodes']) && ! empty($visualGraph['edges'])) {
                // Execute using the structured visual graph traversal (supports branching, connection loops, multiple outputs)
                $visited = [];
                $this->executeGraphNode('start', $visualGraph, $actions, $tenant, $customerPhone, $messageText, $account, $replaceVariables, $visited);
            } else {
                // Fallback to sequential actions if no visual graph exists
                $this->executeSequentialActions($actions, $tenant, $customerPhone, $messageText, $account, $replaceVariables);
            }
        }
    }

    protected function executeGraphNode(
        string $nodeId,
        array $visualGraph,
        array $actions,
        $tenant,
        $customerPhone,
        string $messageText,
        $account,
        callable $replaceVariables,
        array &$visited
    ): void {
        if (isset($visited[$nodeId])) {
            return;
        }
        $visited[$nodeId] = true;

        $currentNode = null;
        foreach ($visualGraph['nodes'] as $node) {
            if (($node['id'] ?? '') === $nodeId) {
                $currentNode = $node;
                break;
            }
        }

        if ($nodeId !== 'start' && $currentNode) {
            $actionIndex = $currentNode['data']['actionIndex'] ?? null;
            $conditionBranchIndex = null;

            if ($actionIndex !== null && isset($actions[$actionIndex])) {
                $action = $actions[$actionIndex];
                if (($action['type'] ?? '') === 'condition') {
                    $conditionOutcome = $this->automationConditionOutcome($action, $messageText);

                    if (! $conditionOutcome['matched']) {
                        return; // Stop traversal on this condition branch
                    }

                    $conditionBranchIndex = $conditionOutcome['branch_index'];
                } else {
                    $this->executeSingleAction($action, $tenant, $customerPhone, $messageText, $account, $replaceVariables);
                }
            }
        }

        // Find and traverse child nodes connected via edges
        $childEdges = array_values(array_filter(
            $visualGraph['edges'],
            fn (array $edge): bool => ($edge['source'] ?? '') === $nodeId && ! empty($edge['target'])
        ));

        if (isset($conditionBranchIndex) && $conditionBranchIndex !== null) {
            $childEdges = isset($childEdges[$conditionBranchIndex])
                ? [$childEdges[$conditionBranchIndex]]
                : [];
        }

        foreach ($childEdges as $edge) {
            $this->executeGraphNode($edge['target'], $visualGraph, $actions, $tenant, $customerPhone, $messageText, $account, $replaceVariables, $visited);
        }
    }

    protected function executeSequentialActions(array $actions, $tenant, $customerPhone, string $messageText, $account, callable $replaceVariables): void
    {
        foreach ($actions as $action) {
            $actionType = $action['type'] ?? '';

            if ($actionType === 'condition') {
                $conditionOutcome = $this->automationConditionOutcome($action, $messageText);

                if (! $conditionOutcome['matched']) {
                    break;
                }

                continue;
            }

            $this->executeSingleAction($action, $tenant, $customerPhone, $messageText, $account, $replaceVariables);
        }
    }

    protected function executeSingleAction($action, $tenant, $customerPhone, string $messageText, $account, callable $replaceVariables): void
    {
        $actionType = $action['type'] ?? '';

        if ($actionType === 'send_message' && ! empty($action['text'])) {
            try {
                $processedText = $replaceVariables($action['text']);
                $api = new WhatsAppCloudApi([
                    'waba_id' => $account->waba_id,
                    'phone_number_id' => $account->phone_number_id,
                    'access_token' => $account->access_token,
                ]);
                $api->sendTextMessage($customerPhone, $processedText);

                $chat = WhatsappChat::where('tenant_id', $tenant->id)
                    ->where('customer_phone', $customerPhone)
                    ->first();

                if ($chat) {
                    $chat->messages()->create([
                        'meta_message_id' => 'auto_'.bin2hex(random_bytes(10)),
                        'direction' => 'outbound',
                        'message_type' => 'text',
                        'body' => $processedText,
                        'sent_at' => now(),
                        'status' => 'sent',
                    ]);
                    $chat->update(['last_message_at' => now()]);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to send automation flow response: '.$e->getMessage());
            }
        } elseif ($actionType === 'add_to_group' && ! empty($action['group_id'])) {
            $contact = $tenant->contacts()->firstOrCreate(
                ['phone' => $customerPhone],
                ['name' => $customerPhone]
            );
            $contact->groups()->syncWithoutDetaching([$action['group_id']]);
        } elseif ($actionType === 'remove_from_group' && ! empty($action['group_id'])) {
            $contact = $tenant->contacts()->where('phone', $customerPhone)->first();
            if ($contact) {
                $contact->groups()->detach([$action['group_id']]);
            }
        } elseif ($actionType === 'send_email') {
            $emailTo = $replaceVariables($action['email_to'] ?? '');
            $subject = $replaceVariables($action['subject'] ?? 'RAVISN Automation Alert');
            $emailText = $replaceVariables($action['text'] ?? '');
            if (! empty($emailTo)) {
                try {
                    Mail::raw($emailText, function ($message) use ($emailTo, $subject) {
                        $message->to($emailTo)->subject($subject);
                    });
                } catch (\Exception $e) {
                    \Log::error('Failed to send automation email: '.$e->getMessage());
                }
            }
        } elseif ($actionType === 'http_request') {
            $method = strtoupper($action['method'] ?? 'POST');
            $url = $replaceVariables($action['url'] ?? '');
            $bodyPayload = $replaceVariables($action['body'] ?? '');
            if (! empty($url)) {
                try {
                    Http::withHeaders([
                        'Content-Type' => 'application/json',
                    ])->send($method, $url, [
                        'body' => $bodyPayload,
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Automation HTTP Request failed: '.$e->getMessage());
                }
            }
        } elseif ($actionType === 'google_sheets') {
            // Google Sheets integration placeholder
        } elseif ($actionType === 'assign_agent') {
            $agentName = $action['agent_name'] ?? 'Agent';
            $chat = WhatsappChat::where('tenant_id', $tenant->id)
                ->where('customer_phone', $customerPhone)
                ->first();
            if ($chat) {
                $chat->messages()->create([
                    'meta_message_id' => 'system_'.bin2hex(random_bytes(10)),
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'body' => '[System Action] Chat transferred to agent: '.$agentName,
                    'sent_at' => now(),
                    'status' => 'read',
                ]);
            }
        } elseif ($actionType === 'save_response') {
            $responseField = $action['response_field'] ?? 'notes';
            $contact = $tenant->contacts()->firstOrCreate(
                ['phone' => $customerPhone],
                ['name' => $customerPhone]
            );
            $contact->update([
                $responseField => $messageText,
            ]);
        } elseif ($actionType === 'delay') {
            $delaySeconds = min((int) ($action['delay_seconds'] ?? 5), 10);
            if ($delaySeconds > 0) {
                sleep($delaySeconds);
            }
        }
    }

    /**
     * Match conditions against incoming message text.
     */
    protected function automationConditionMatches(array|string|null $action, string $messageText): bool
    {
        if (is_array($action)) {
            return $this->automationConditionOutcome($action, $messageText)['matched'];
        }

        if (is_string($action)) {
            return $this->singleConditionMatches($action, $messageText);
        }

        return true;
    }

    /**
     * @return array{matched: bool, branch_index: int|null}
     */
    protected function automationConditionOutcome(array $action, string $messageText): array
    {
        $conditions = $action['conditions'] ?? null;
        if (! is_array($conditions) || empty($conditions)) {
            return [
                'matched' => $this->singleConditionMatches($action['condition'] ?? null, $messageText),
                'branch_index' => 0,
            ];
        }

        $relation = strtoupper($action['conditions_relation'] ?? 'AND');

        if ($relation === 'OR') {
            foreach ($conditions as $conditionIndex => $cond) {
                if ($this->singleConditionMatches($cond, $messageText)) {
                    return [
                        'matched' => true,
                        'branch_index' => $conditionIndex,
                    ];
                }
            }

            return ['matched' => false, 'branch_index' => null];
        } else {
            foreach ($conditions as $cond) {
                if (! $this->singleConditionMatches($cond, $messageText)) {
                    return ['matched' => false, 'branch_index' => null];
                }
            }

            return ['matched' => true, 'branch_index' => 0];
        }
    }

    /**
     * Match a single condition object or expression string.
     */
    protected function singleConditionMatches(array|string|null $cond, string $messageText): bool
    {
        if (is_array($cond)) {
            $operator = $cond['operator'] ?? 'contains';
            $expected = trim((string) ($cond['value'] ?? ''), " \t\n\r\0\x0B\"'");

            return match ($operator) {
                'equals' => strcasecmp($messageText, $expected) === 0,
                'starts_with' => str_starts_with(mb_strtolower($messageText), mb_strtolower($expected)),
                'ends_with' => str_ends_with(mb_strtolower($messageText), mb_strtolower($expected)),
                default => mb_stripos($messageText, $expected) !== false,
            };
        }

        $condition = trim((string) $cond);

        if ($condition === '') {
            return true;
        }

        if (preg_match('/^(?:\{\{\{senderMessage\}\}\}|message)\s+(contains|equals|starts_with|ends_with)\s+(.+)$/i', $condition, $matches)) {
            $operator = mb_strtolower($matches[1]);
            $expected = trim($matches[2], " \t\n\r\0\x0B\"'");

            return match ($operator) {
                'equals' => strcasecmp($messageText, $expected) === 0,
                'starts_with' => str_starts_with(mb_strtolower($messageText), mb_strtolower($expected)),
                'ends_with' => str_ends_with(mb_strtolower($messageText), mb_strtolower($expected)),
                default => mb_stripos($messageText, $expected) !== false,
            };
        }

        return mb_stripos($messageText, $condition) !== false;
    }

    /**
     * Handle phone number quality rating updates from Meta webhook.
     *
     * @param  array<string, mixed>  $value
     */
    protected function handlePhoneNumberQualityUpdate(array $value): void
    {
        $phoneNumberId = $value['phone_number_id'] ?? null;
        $newRating = strtoupper($value['new_quality_rating'] ?? '');

        if (! $phoneNumberId) {
            return;
        }

        $account = WhatsappAccount::where('phone_number_id', $phoneNumberId)->first();
        if (! $account) {
            \Illuminate\Support\Facades\Log::warning('Webhook received for unknown phone_number_id', ['phone_number_id' => $phoneNumberId]);
            return;
        }

        $oldRating = $account->quality_rating;
        $account->update([
            'quality_rating' => $newRating,
        ]);

        if (in_array($newRating, ['YELLOW', 'RED'])) {
            $type = $newRating === 'RED' ? 'error' : 'warning';
            $arTitle = $newRating === 'RED' ? 'Critical: Phone number quality dropped to RED' : 'Warning: Phone number quality dropped to YELLOW';
            $arMessage = "Your phone number ({$account->phone_number}) from {$oldRating} to {$newRating}. Please review customer feedback to avoid phone number restrictions.";

            SystemNotification::create([
                'tenant_id' => $account->tenant_id,
                'title' => $arTitle,
                'message' => $arMessage,
                'type' => $type,
            ]);
        }
    }
}
