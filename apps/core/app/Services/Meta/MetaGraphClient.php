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

    /**
     * Retrieve WhatsApp phone number metadata & quality rating.
     */
    public function getPhoneNumberDetails(string $phoneNumberId, string $accessToken): ?array
    {
        $url = "{$this->baseUrl}/{$phoneNumberId}";

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($url, [
                'fields' => 'id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier,status,name_status',
            ]);

        if (! $response->successful()) {
            Log::warning('[MetaGraphClient] Failed to fetch phone number details', [
                'phoneNumberId' => $phoneNumberId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            return null;
        }

        return $response->json();
    }

    /**
     * Retrieve WhatsApp Business Account (WABA) metadata.
     */
    public function getWabaDetails(string $wabaId, string $accessToken): ?array
    {
        $url = "{$this->baseUrl}/{$wabaId}";

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($url, [
                'fields' => 'id,name,currency,timezone_id,message_template_namespace',
            ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }

    /**
     * Retrieve WhatsApp Business Profile (about, description, profile_picture_url).
     */
    public function getWhatsAppBusinessProfile(string $phoneNumberId, string $accessToken): ?array
    {
        $url = "{$this->baseUrl}/{$phoneNumberId}/whatsapp_business_profile";

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($url, [
                'fields' => 'about,address,description,email,profile_picture_url,websites,vertical',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json('data.0') ?? $response->json('data') ?? $response->json();
        return is_array($data) ? $data : null;
    }

    /**
     * Retrieve Facebook Page metadata and profile picture.
     */
    public function getPageDetails(string $pageId, string $accessToken): ?array
    {
        $url = "{$this->baseUrl}/{$pageId}";

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($url, [
                'fields' => 'id,name,category,tasks,is_published,picture.type(large){url}',
            ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }

    /**
     * Swap a short-lived Facebook Login token (about an hour) for a long-lived
     * one (about 60 days). Page tokens derived from a long-lived token do not
     * expire, so Messenger/Instagram keep working after the admin logs out.
     * Without app credentials the original token is returned unchanged.
     */
    public function exchangeForLongLivedToken(string $userAccessToken): string
    {
        $appId = config('services.meta.app_id');
        $appSecret = config('services.meta.app_secret');

        if (blank($appId) || blank($appSecret)) {
            return $userAccessToken;
        }

        $response = Http::timeout(10)->get("{$this->baseUrl}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'fb_exchange_token' => $userAccessToken,
        ]);

        if (! $response->successful() || blank($response->json('access_token'))) {
            Log::warning('[MetaGraphClient] Long-lived token exchange failed; keeping the short-lived token', ['status' => $response->status()]);

            return $userAccessToken;
        }

        return (string) $response->json('access_token');
    }

    /**
     * Facebook Pages a Facebook Login token manages, each with its own Page
     * access token (messages must be sent with the Page's token, not the
     * person's) and its linked Instagram professional account, if any.
     *
     * @return list<array{id: string, name: string, category: ?string, access_token: ?string, picture_url: ?string, instagram: ?array{id: string, username: ?string, profile_picture_url: ?string}}>
     */
    public function getManagedPages(string $userAccessToken): array
    {
        $response = Http::withToken($userAccessToken)
            ->timeout(10)
            ->get("{$this->baseUrl}/me/accounts", [
                'fields' => 'id,name,category,access_token,picture.type(large){url},instagram_business_account{id,username,profile_picture_url}',
                'limit' => 100,
            ]);

        if (! $response->successful()) {
            Log::warning('[MetaGraphClient] Failed to list managed Pages', ['status' => $response->status()]);

            return [];
        }

        return collect($response->json('data', []))
            ->filter(fn ($page) => ! empty($page['id']))
            ->map(fn (array $page) => [
                'id' => (string) $page['id'],
                'name' => (string) ($page['name'] ?? $page['id']),
                'category' => $page['category'] ?? null,
                'access_token' => $page['access_token'] ?? null,
                'picture_url' => $page['picture']['data']['url'] ?? null,
                'instagram' => isset($page['instagram_business_account']['id']) ? [
                    'id' => (string) $page['instagram_business_account']['id'],
                    'username' => $page['instagram_business_account']['username'] ?? null,
                    'profile_picture_url' => $page['instagram_business_account']['profile_picture_url'] ?? null,
                ] : null,
            ])
            ->values()
            ->all();
    }

    /**
     * WhatsApp phone numbers a Facebook Login token can operate.
     *
     * The WABAs come from the token's granular scopes (debug_token, which
     * needs the app credentials), falling back to the WABAs shared with the
     * app's business.
     *
     * @return list<array{id: string, waba_id: string, display_phone_number: ?string, verified_name: ?string}>
     */
    public function getAccessibleWhatsAppNumbers(string $userAccessToken): array
    {
        $wabaIds = [];

        $appId = config('services.meta.app_id');
        $appSecret = config('services.meta.app_secret');
        if (filled($appId) && filled($appSecret)) {
            $debug = Http::timeout(10)->get("{$this->baseUrl}/debug_token", [
                'input_token' => $userAccessToken,
                'access_token' => "{$appId}|{$appSecret}",
            ]);

            foreach ($debug->json('data.granular_scopes', []) as $scope) {
                if (in_array($scope['scope'] ?? null, ['whatsapp_business_management', 'whatsapp_business_messaging'], true)) {
                    $wabaIds = [...$wabaIds, ...($scope['target_ids'] ?? [])];
                }
            }
        }

        if ($wabaIds === []) {
            $shared = Http::withToken($userAccessToken)->timeout(10)->get("{$this->baseUrl}/me/client_whatsapp_business_accounts");
            $wabaIds = array_column($shared->json('data', []), 'id');
        }

        $numbers = [];
        foreach (array_unique(array_map('strval', $wabaIds)) as $wabaId) {
            $response = Http::withToken($userAccessToken)
                ->timeout(10)
                ->get("{$this->baseUrl}/{$wabaId}/phone_numbers", ['fields' => 'id,display_phone_number,verified_name']);

            foreach ($response->json('data', []) as $number) {
                if (! empty($number['id'])) {
                    $numbers[] = [
                        'id' => (string) $number['id'],
                        'waba_id' => $wabaId,
                        'display_phone_number' => $number['display_phone_number'] ?? null,
                        'verified_name' => $number['verified_name'] ?? null,
                    ];
                }
            }
        }

        return $numbers;
    }

    /**
     * Retrieve Instagram Business Account metadata.
     */
    public function getInstagramDetails(string $igUserId, string $accessToken): ?array
    {
        $url = "{$this->baseUrl}/{$igUserId}";

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($url, [
                'fields' => 'id,username,name,profile_picture_url,followers_count',
            ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }
}
