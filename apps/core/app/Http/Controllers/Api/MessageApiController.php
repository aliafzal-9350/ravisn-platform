<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MessageApiController extends Controller
{
    /**
     * Send a free-text session message via API.
     */
    public function sendText(Request $request, WhatsAppCloudApi $whatsAppApi): JsonResponse
    {
        $tenant = $request->get('tenant');

        $validated = $request->validate([
            'phone_number_id' => ['required', 'string'],
            'to' => ['required', 'string'],
            'body' => ['required', 'string'],
        ]);

        $account = $tenant->whatsappAccounts()
            ->where('phone_number_id', $validated['phone_number_id'])
            ->where('status', 'active')
            ->first();

        if (! $account) {
            return response()->json(['error' => 'WhatsApp account not found or not active.'], 404);
        }

        // Clean to phone number
        $to = $validated['to'];
        if (! str_starts_with($to, '+')) {
            $to = '+'.preg_replace('/[^0-9]/', '', $to);
        }

        if ($account->access_token) {
            $whatsAppApi->withToken($account->access_token);
        }

        try {
            $response = $whatsAppApi->sendTextMessage($account->phone_number_id, $to, $validated['body']);
            $msgId = $response->json('messages.0.id');

            // Log in local inbox chat database so it is visible in UI
            $chat = $account->chats()->firstOrCreate(
                ['customer_phone' => $to],
                [
                    'tenant_id' => $tenant->id,
                    'customer_name' => $to,
                    'last_message_at' => now(),
                ]
            );

            $message = $chat->messages()->create([
                'direction' => 'outbound',
                'message_type' => 'text',
                'body' => $validated['body'],
                'meta_message_id' => $msgId,
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            $chat->update(['last_message_at' => now()]);

            return response()->json([
                'status' => 'success',
                'message_id' => $msgId,
            ]);

        } catch (\Exception $e) {
            Log::error('API outbound text message failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Failed to send message: '.$e->getMessage()], 422);
        }
    }

    /**
     * Send a template message via API.
     */
    public function sendTemplate(Request $request, WhatsAppCloudApi $whatsAppApi): JsonResponse
    {
        $tenant = $request->get('tenant');

        $validated = $request->validate([
            'phone_number_id' => ['required', 'string'],
            'to' => ['required', 'string'],
            'template_name' => ['required', 'string'],
            'language' => ['nullable', 'string'],
            'variables' => ['nullable', 'array'],
        ]);

        $account = $tenant->whatsappAccounts()
            ->where('phone_number_id', $validated['phone_number_id'])
            ->where('status', 'active')
            ->first();

        if (! $account) {
            return response()->json(['error' => 'WhatsApp account not found or not active.'], 404);
        }

        // Clean recipient number
        $to = $validated['to'];
        if (! str_starts_with($to, '+')) {
            $to = '+'.preg_replace('/[^0-9]/', '', $to);
        }

        // Find template by name and WhatsApp account
        $template = $tenant->messageTemplates()
            ->where('whatsapp_account_id', (string) $account->id)
            ->where('name', $validated['template_name'])
            ->whereIn('status', ['approved', 'APPROVED'])
            ->first();

        if (! $template) {
            return response()->json(['error' => 'Template not found for this WhatsApp account.'], 404);
        }

        // Build template components from variables array (body, buttons, etc.)
        $components = [];
        if (! empty($validated['variables'])) {
            $components = $template->getTemplateComponents($validated['variables']);
        }

        if ($account->access_token) {
            $whatsAppApi->withToken($account->access_token);
        }

        $lang = $validated['language'] ?? 'en';

        try {
            $response = $whatsAppApi->sendTemplateMessage(
                $account->phone_number_id,
                $to,
                $validated['template_name'],
                $lang,
                $components
            );
            $msgId = $response->json('messages.0.id');

            // Log in local inbox chat database so it is visible in UI
            $chat = $account->chats()->firstOrCreate(
                ['customer_phone' => $to],
                [
                    'tenant_id' => $tenant->id,
                    'customer_name' => $to,
                    'last_message_at' => now(),
                ]
            );

            if ($template) {
                $approxBody = $template->formatBodyText($validated['variables'] ?? []);
            } else {
                $approxBody = "Template Broadcast: {$validated['template_name']}";
                if (! empty($validated['variables'])) {
                    $approxBody .= ' ('.implode(', ', $validated['variables']).')';
                }
            }

            $message = $chat->messages()->create([
                'direction' => 'outbound',
                'message_type' => 'template',
                'body' => $approxBody,
                'meta_message_id' => $msgId,
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            $chat->update(['last_message_at' => now()]);

            return response()->json([
                'status' => 'success',
                'message_id' => $msgId,
            ]);

        } catch (\Exception $e) {
            Log::error('API outbound template message failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Failed to send message: '.$e->getMessage()], 422);
        }
    }
}
