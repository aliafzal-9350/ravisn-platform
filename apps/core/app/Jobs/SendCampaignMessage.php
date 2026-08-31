<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCampaignMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [5, 20, 60];
    public int $timeout = 30;

    public function __construct(
        public Campaign $campaign,
        public CampaignRecipient $recipient
    ) {
        $this->onQueue('campaigns');
    }

    public function handle(WhatsAppCloudApi $whatsAppApi): void
    {
        // 1. Skip if contact opted out
        $contact = Contact::where('tenant_id', $this->campaign->tenant_id)
            ->where('phone', $this->recipient->phone_number)
            ->first();

        if ($contact && ($contact->is_opted_out ?? false)) {
            $this->recipient->update([
                'status' => 'failed',
                'error_message' => 'Contact previously opted out (STOP).',
            ]);
            $this->campaign->increment('failed_count');
            $this->checkCampaignCompleted();
            return;
        }

        $account = $this->campaign->whatsappAccount;
        if (! $account) {
            $this->recipient->update([
                'status' => 'failed',
                'error_message' => 'WhatsApp account not configured.',
            ]);
            $this->campaign->increment('failed_count');
            $this->checkCampaignCompleted();
            return;
        }

        if ($account->access_token) {
            $whatsAppApi->withToken($account->access_token);
        }

        // 2. Direct message handling
        if ($this->campaign->message_type === 'direct') {
            try {
                $response = $whatsAppApi->sendTextMessage(
                    $account->phone_number_id,
                    $this->recipient->phone_number,
                    $this->campaign->direct_message_body ?? ''
                );

                if ($response->successful()) {
                    $wamid = $response->json('messages.0.id');
                    $this->recipient->update([
                        'status' => 'sent',
                        'whatsapp_message_id' => $wamid,
                        'sent_at' => now(),
                        'error_message' => null,
                    ]);

                    $this->campaign->increment('sent_count');
                } else {
                    $status = $response->status();
                    $errBody = $response->json('error.message', 'Unknown Meta Error');

                    if ($status === 429 || $response->json('error.code') === 130429) {
                        $this->release(30);
                        return;
                    }

                    $this->recipient->update([
                        'status' => 'failed',
                        'error_message' => "Meta Error ({$status}): {$errBody}",
                    ]);
                    $this->campaign->increment('failed_count');
                }
            } catch (\Throwable $e) {
                Log::error('SendCampaignMessage direct message exception', [
                    'recipient_id' => $this->recipient->id,
                    'error' => $e->getMessage(),
                ]);

                if ($this->attempts() < $this->tries) {
                    $this->release(10);
                    return;
                }

                $this->recipient->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
                $this->campaign->increment('failed_count');
            }

            $this->checkCampaignCompleted();
            return;
        }

        // 3. Template message handling
        $template = $this->campaign->messageTemplate;
        if (! $template) {
            $this->recipient->update([
                'status' => 'failed',
                'error_message' => 'Template not found.',
            ]);
            $this->campaign->increment('failed_count');
            $this->checkCampaignCompleted();
            return;
        }

        try {
            $templateComponents = is_string($template->components)
                ? json_decode($template->components, true)
                : ($template->components ?? []);

            $bodyText = '';
            $hasImageHeader = false;

            foreach ($templateComponents ?: [] as $comp) {
                $type = strtoupper($comp['type'] ?? '');
                if ($type === 'BODY') {
                    $bodyText = $comp['text'] ?? '';
                } elseif ($type === 'HEADER' && strtoupper($comp['format'] ?? '') === 'IMAGE') {
                    $hasImageHeader = true;
                }
            }

            // Count matches of {{...}} in body text
            preg_match_all('/\{\{([^}]+)\}\}/', $bodyText, $matches);
            $expectedBodyParamCount = count($matches[0] ?? []);

            $rawVars = $this->recipient->template_variables 
                ?? $this->recipient->variables 
                ?? [];
            if (is_string($rawVars)) {
                $rawVars = json_decode($rawVars, true) ?? [];
            }
            if (! is_array($rawVars)) {
                $rawVars = [];
            }

            $slicedVars = array_slice($rawVars, 0, $expectedBodyParamCount);

            $bodyParameters = [];
            foreach ($slicedVars as $index => $var) {
                $param = [
                    'type' => 'text',
                    'text' => (string) $var,
                ];
                $placeholderName = trim($matches[1][$index] ?? '');
                if (! empty($placeholderName) && ! ctype_digit($placeholderName)) {
                    $param['parameter_name'] = $placeholderName;
                }
                $bodyParameters[] = $param;
            }

            $components = [];

            // 1. Header Image (if template has IMAGE header and URL exists)
            if ($hasImageHeader && ! empty($this->campaign->header_media_url)) {
                $components[] = [
                    'type' => 'header',
                    'parameters' => [
                        [
                            'type' => 'image',
                            'image' => [
                                'link' => $this->campaign->header_media_url,
                            ],
                        ],
                    ],
                ];
            }

            // 2. Body Parameters (only add if template expects > 0 body params)
            if ($expectedBodyParamCount > 0 && ! empty($bodyParameters)) {
                $components[] = [
                    'type' => 'body',
                    'parameters' => $bodyParameters,
                ];
            }

            // 3. Button Parameters (URL buttons with {{1}} placeholders)
            foreach ($templateComponents ?: [] as $component) {
                $type = strtoupper($component['type'] ?? '');
                if ($type !== 'BUTTONS' || empty($component['buttons'])) {
                    continue;
                }

                foreach ($component['buttons'] as $buttonIndex => $button) {
                    $buttonType = strtoupper($button['type'] ?? '');
                    if ($buttonType !== 'URL') {
                        continue;
                    }

                    $url = $button['url'] ?? '';
                    preg_match_all('/\{\{\s*([^}]+)\s*\}\}/', $url, $urlMatches);

                    if (empty($urlMatches[1])) {
                        continue;
                    }

                    $buttonParams = [];
                    foreach ($urlMatches[1] as $urlParamIndex => $paramName) {
                        $buttonVarIndex = $expectedBodyParamCount + $urlParamIndex;
                        if (isset($rawVars[$buttonVarIndex])) {
                            $buttonParams[] = [
                                'type' => 'text',
                                'text' => (string) $rawVars[$buttonVarIndex],
                            ];
                        }
                    }

                    if (! empty($buttonParams)) {
                        $components[] = [
                            'type' => 'button',
                            'sub_type' => 'url',
                            'index' => (string) $buttonIndex,
                            'parameters' => $buttonParams,
                        ];
                    }
                }
            }

            $response = $whatsAppApi->sendTemplateMessage(
                $account->phone_number_id,
                $this->recipient->phone_number,
                $template->name,
                $template->language,
                $components
            );

            if ($response->successful()) {
                $wamid = $response->json('messages.0.id');
                $this->recipient->update([
                    'status' => 'sent',
                    'whatsapp_message_id' => $wamid,
                    'sent_at' => now(),
                    'error_message' => null,
                ]);

                $this->campaign->increment('sent_count');
            } else {
                $status = $response->status();
                $errBody = $response->json('error.message', 'Unknown Meta Error');

                if ($status === 429 || $response->json('error.code') === 130429) {
                    $this->release(30);
                    return;
                }

                $this->recipient->update([
                    'status' => 'failed',
                    'error_message' => "Meta Error ({$status}): {$errBody}",
                ]);
                $this->campaign->increment('failed_count');
            }
        } catch (\Throwable $e) {
            Log::error('SendCampaignMessage job exception', [
                'recipient_id' => $this->recipient->id,
                'error' => $e->getMessage(),
            ]);

            if ($this->attempts() < $this->tries) {
                $this->release(10);
                return;
            }

            $this->recipient->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            $this->campaign->increment('failed_count');
        }

        $this->checkCampaignCompleted();
    }

    protected function checkCampaignCompleted(): void
    {
        if ($this->campaign->hasProcessedAllRecipients()) {
            $this->campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }
    }
}
