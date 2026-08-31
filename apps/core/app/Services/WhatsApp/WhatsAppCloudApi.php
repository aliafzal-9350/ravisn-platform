<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class WhatsAppCloudApi
{
    protected string $apiUrl;

    protected string $apiVersion;

    /**
     * Create a new WhatsApp Cloud API instance.
     */
    public function __construct()
    {
        $this->apiUrl = config('whatsapp.api_url');
        $this->apiVersion = config('whatsapp.api_version');
    }

    protected ?string $customToken = null;

    /**
     * Set a custom access token for the next request(s).
     */
    public function withToken(?string $token): self
    {
        $this->customToken = $token;

        return $this;
    }

    /**
     * Build an authenticated HTTP client.
     */
    protected function client(): PendingRequest
    {
        $token = $this->customToken;

        return Http::baseUrl("{$this->apiUrl}/{$this->apiVersion}")
            ->withToken($token)
            ->acceptJson()
            ->throw();
    }

    /**
     * Send a template message to a recipient.
     *
     * @param  array<string, mixed>  $components
     */
    public function sendTemplateMessage(
        string $phoneNumberId,
        string $to,
        string $templateName,
        string $languageCode,
        array $components = [],
    ): Response {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $languageCode],
            ],
        ];

        if (! empty($components)) {
            $payload['template']['components'] = $components;
        }

        return $this->client()->post("{$phoneNumberId}/messages", $payload);
    }

    /**
     * Request a verification code for a phone number.
     */
    public function requestVerificationCode(
        string $phoneNumberId,
        string $codeMethod = 'SMS',
        string $language = 'en',
    ): Response {
        return $this->client()->post("{$phoneNumberId}/request_code", [
            'code_method' => $codeMethod,
            'language' => $language,
        ]);
    }

    /**
     * Verify a phone number with a code.
     */
    public function verifyCode(string $phoneNumberId, string $code): Response
    {
        return $this->client()->post("{$phoneNumberId}/verify_code", [
            'code' => $code,
        ]);
    }

    /**
     * Register a phone number.
     */
    public function registerPhoneNumber(string $phoneNumberId, string $pin): Response
    {
        return $this->client()->post("{$phoneNumberId}/register", [
            'messaging_product' => 'whatsapp',
            'pin' => $pin,
        ]);
    }

    /**
     * Get details for a specific phone number.
     *
     * @return array<string, mixed>
     */
    public function getPhoneNumberDetails(string $phoneNumberId): array
    {
        $response = $this->client()->get($phoneNumberId, [
            'fields' => 'display_phone_number,verified_name,quality_rating,messaging_limit_tier',
        ]);

        return $response->json();
    }

    /**
     * Get phone numbers for a WABA.
     *
     * @return array<string, mixed>
     */
    public function getPhoneNumbers(string $wabaId): array
    {
        $response = $this->client()->get("{$wabaId}/phone_numbers");

        return $response->json('data', []);
    }

    /**
     * Create a message template.
     *
     * @param  array<string, mixed>  $templateData
     */
    public function createTemplate(string $wabaId, array $templateData): Response
    {
        return $this->client()->post("{$wabaId}/message_templates", $templateData);
    }

    /**
     * Get message templates for a WABA.
     *
     * @return array<string, mixed>
     */
    public function getTemplates(string $wabaId): array
    {
        $response = $this->client()->get("{$wabaId}/message_templates");

        return $response->json('data', []);
    }

    /**
     * Delete a message template.
     */
    public function deleteTemplate(string $wabaId, string $templateName): Response
    {
        return $this->client()->delete("{$wabaId}/message_templates", [
            'name' => $templateName,
        ]);
    }

    /**
     * Get the business profile for a phone number.
     *
     * @return array<string, mixed>
     */
    public function getBusinessProfile(string $phoneNumberId): array
    {
        $response = $this->client()->get("{$phoneNumberId}/whatsapp_business_profile", [
            'fields' => 'about,address,description,email,profile_picture_url,websites,vertical',
        ]);

        return $response->json('data', []);
    }

    /**
     * Send a free-text session response message.
     */
    public function sendTextMessage(string $phoneNumberId, string $to, string $body): Response
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $to,
            'type' => 'text',
            'text' => [
                'preview_url' => false,
                'body' => $body,
            ],
        ];

        return $this->client()->post("{$phoneNumberId}/messages", $payload);
    }
}
