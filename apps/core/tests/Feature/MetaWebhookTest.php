<?php

namespace Tests\Feature;

use App\Jobs\PushInboundToAiJob;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MetaWebhookTest extends TestCase
{
    public function test_meta_webhook_verification_handshake(): void
    {
        $verifyToken = 'test_verify_token_123';
        config(['services.meta.webhook_verify_token' => $verifyToken]);

        $response = $this->get('/api/v1/webhooks/meta?hub_mode=subscribe&hub_verify_token=' . $verifyToken . '&hub_challenge=CHALLENGE_CODE_123');

        $response->assertStatus(200);
        $this->assertEquals('CHALLENGE_CODE_123', $response->getContent());
    }

    public function test_meta_webhook_verification_handshake_rejects_invalid_token(): void
    {
        config(['services.meta.webhook_verify_token' => 'correct_token']);

        $response = $this->get('/api/v1/webhooks/meta?hub_mode=subscribe&hub_verify_token=wrong_token&hub_challenge=CHALLENGE_CODE_123');

        $response->assertStatus(403);
    }

    public function test_meta_webhook_event_ingestion_returns_fast_200_and_dispatches_job(): void
    {
        Queue::fake();

        $msgId = 'wamid.HBgLMTU1NTEyMzQ1NjcVAgASGBQzQT_' . \Illuminate\Support\Str::random(10);
        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [
                [
                    'id' => '123456789',
                    'changes' => [
                        [
                            'value' => [
                                'messaging_product' => 'whatsapp',
                                'metadata' => [
                                    'display_phone_number' => '15550234567',
                                    'phone_number_id' => '1000123456789',
                                ],
                                'messages' => [
                                    [
                                        'from' => '15551234567',
                                        'id' => $msgId,
                                        'timestamp' => '1710000000',
                                        'text' => [
                                            'body' => 'Hello, I need assistance with my booking',
                                        ],
                                        'type' => 'text',
                                    ],
                                ],
                            ],
                            'field' => 'messages',
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/webhooks/meta', $payload);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'EVENT_RECEIVED']);

        Queue::assertPushed(PushInboundToAiJob::class, function ($job) use ($payload) {
            return $job->payload === $payload;
        });
    }
}
