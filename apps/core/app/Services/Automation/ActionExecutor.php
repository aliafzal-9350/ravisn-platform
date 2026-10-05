<?php

namespace App\Services\Automation;

use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Executes a single automation flow action node. Extracted from
 * WebhookHandler so it can be invoked per-node by the queued
 * ExecuteWorkflowNodeJob instead of running the whole flow synchronously
 * inside the webhook request.
 */
class ActionExecutor
{
    /**
     * @return array<string, mixed> a small, loggable summary of what happened
     */
    public function execute(
        array $action,
        Tenant $tenant,
        string $customerPhone,
        string $messageText,
        WhatsappAccount $account,
        callable $replaceVariables
    ): array {
        $actionType = $action['type'] ?? '';

        return match ($actionType) {
            'send_message' => $this->sendMessage($action, $tenant, $customerPhone, $account, $replaceVariables),
            'add_to_group' => $this->addToGroup($action, $tenant, $customerPhone),
            'remove_from_group' => $this->removeFromGroup($action, $tenant, $customerPhone),
            'send_email' => $this->sendEmail($action, $replaceVariables),
            'http_request' => $this->httpRequest($action, $replaceVariables),
            'assign_agent' => $this->assignAgent($action, $tenant, $customerPhone),
            'save_response' => $this->saveResponse($action, $tenant, $customerPhone, $messageText),
            'disable_autoreply' => $this->disableAutoreply($tenant, $customerPhone),
            'google_sheets' => ['status' => 'skipped', 'reason' => 'Google Sheets integration not yet implemented'],
            default => ['status' => 'skipped', 'reason' => "Unknown action type: {$actionType}"],
        };
    }

    protected function sendMessage(array $action, Tenant $tenant, string $customerPhone, WhatsappAccount $account, callable $replaceVariables): array
    {
        if (empty($action['text'])) {
            return ['status' => 'skipped', 'reason' => 'No message text configured'];
        }

        try {
            $processedText = $replaceVariables($action['text']);
            $api = new WhatsAppCloudApi;
            if ($account->access_token) {
                $api->withToken($account->access_token);
            }
            $api->sendTextMessage($account->phone_number_id, $customerPhone, $processedText);

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

            return ['status' => 'sent', 'text' => $processedText];
        } catch (\Exception $e) {
            Log::error('Failed to send automation flow response: '.$e->getMessage());

            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function addToGroup(array $action, Tenant $tenant, string $customerPhone): array
    {
        if (empty($action['group_id'])) {
            return ['status' => 'skipped', 'reason' => 'No group_id configured'];
        }

        $contact = $tenant->contacts()->firstOrCreate(
            ['phone' => $customerPhone],
            ['name' => $customerPhone]
        );
        $contact->groups()->syncWithoutDetaching([$action['group_id']]);

        return ['status' => 'completed', 'group_id' => $action['group_id']];
    }

    protected function removeFromGroup(array $action, Tenant $tenant, string $customerPhone): array
    {
        if (empty($action['group_id'])) {
            return ['status' => 'skipped', 'reason' => 'No group_id configured'];
        }

        $contact = $tenant->contacts()->where('phone', $customerPhone)->first();
        if ($contact) {
            $contact->groups()->detach([$action['group_id']]);
        }

        return ['status' => 'completed', 'group_id' => $action['group_id']];
    }

    protected function sendEmail(array $action, callable $replaceVariables): array
    {
        $emailTo = $replaceVariables($action['email_to'] ?? '');
        $subject = $replaceVariables($action['subject'] ?? 'RAVISN Automation Alert');
        $emailText = $replaceVariables($action['text'] ?? '');

        if (empty($emailTo)) {
            return ['status' => 'skipped', 'reason' => 'No email_to configured'];
        }

        try {
            Mail::raw($emailText, function ($message) use ($emailTo, $subject) {
                $message->to($emailTo)->subject($subject);
            });

            return ['status' => 'sent', 'to' => $emailTo];
        } catch (\Exception $e) {
            Log::error('Failed to send automation email: '.$e->getMessage());

            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function httpRequest(array $action, callable $replaceVariables): array
    {
        $method = strtoupper($action['method'] ?? 'POST');
        $url = $replaceVariables($action['url'] ?? '');
        $bodyPayload = $replaceVariables($action['body'] ?? '');

        if (empty($url)) {
            return ['status' => 'skipped', 'reason' => 'No url configured'];
        }

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->send($method, $url, [
                'body' => $bodyPayload,
            ]);

            return ['status' => 'completed', 'http_status' => $response->status()];
        } catch (\Exception $e) {
            Log::error('Automation HTTP Request failed: '.$e->getMessage());

            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function assignAgent(array $action, Tenant $tenant, string $customerPhone): array
    {
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

        return ['status' => 'completed', 'agent_name' => $agentName];
    }

    protected function saveResponse(array $action, Tenant $tenant, string $customerPhone, string $messageText): array
    {
        $responseField = $action['response_field'] ?? 'notes';
        $contact = $tenant->contacts()->firstOrCreate(
            ['phone' => $customerPhone],
            ['name' => $customerPhone]
        );
        $contact->update([
            $responseField => $messageText,
        ]);

        return ['status' => 'completed', 'field' => $responseField];
    }

    protected function disableAutoreply(Tenant $tenant, string $customerPhone): array
    {
        $chat = WhatsappChat::where('tenant_id', $tenant->id)
            ->where('customer_phone', $customerPhone)
            ->first();

        if (! $chat) {
            return ['status' => 'skipped', 'reason' => 'No chat found for this contact'];
        }

        $chat->update(['is_ai_active' => false]);

        return ['status' => 'completed'];
    }
}
