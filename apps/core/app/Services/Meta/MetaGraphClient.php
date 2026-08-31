<?php

namespace App\Services\Meta;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaGraphClient
{
    protected string $apiVersion;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', env('META_API_VERSION', 'v21.0'));
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    /**
     * Send text message to WhatsApp recipient.
     */
    public function sendWhatsAppMessage(string $phoneNumberId, string $toPhone, string $text, string $accessToken): array
    {
        $url = "{$this->baseUrl}/{$phoneNumberId}/messages";

        $response = Http::withToken($accessToken)
            ->timeout(15)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $toPhone,
                'type' => 'text',
                'text' => [
                    'preview_url' => false,
                    'body' => $text,
                ],
            ]);

        if (! $response->successful()) {
            Log::error('[MetaGraphClient] Failed to send WhatsApp message', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }

        return $response->json() ?? [];
    }

    /**
     * Send message template to WhatsApp recipient.
     */
    public function sendWhatsAppTemplate(
        string $phoneNumberId,
        string $toPhone,
        string $templateName,
        string $languageCode,
        array $components,
        string $accessToken
    ): array {
        $url = "{$this->baseUrl}/{$phoneNumberId}/messages";

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $toPhone,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode,
                ],
                'components' => $components,
            ],
        ];

        $response = Http::withToken($accessToken)
            ->timeout(15)
            ->post($url, $payload);

        if (! $response->successful()) {
            Log::error('[MetaGraphClient] Failed to send WhatsApp template', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }

        return $response->json() ?? [];
    }

    /**
     * Send Messenger / Instagram message.
     */
    public function sendPageMessage(string $pageId, string $recipientId, string $text, string $accessToken): array
    {
        $url = "{$this->baseUrl}/me/messages";

        $response = Http::withToken($accessToken)
            ->timeout(15)
            ->post($url, [
                'recipient' => ['id' => $recipientId],
                'message' => ['text' => $text],
            ]);

        return $response->json() ?? [];
    }
}
