<?php

use App\Jobs\PushInboundToAiJob;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

function signedMetaDelivery(): string
{
    return json_encode([
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => '1', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => '1000123456789'],
                'messages' => [['from' => '15551234567', 'id' => 'wamid.'.Str::random(16), 'type' => 'text', 'text' => ['body' => 'hi']]],
            ],
        ]]]],
    ]);
}

function postMetaDelivery(object $test, string $body, ?string $signature)
{
    $server = ['CONTENT_TYPE' => 'application/json'];
    if ($signature !== null) {
        $server['HTTP_X_HUB_SIGNATURE_256'] = $signature;
    }

    return $test->call('POST', '/api/v1/webhooks/meta', [], [], [], $server, $body);
}

test('with an app secret configured, unsigned deliveries are rejected in every environment', function () {
    Queue::fake();
    config(['services.meta.app_secret' => 'meta-app-secret']);

    postMetaDelivery($this, signedMetaDelivery(), signature: null)->assertStatus(401);
    postMetaDelivery($this, signedMetaDelivery(), signature: 'sha256=forged')->assertStatus(401);

    Queue::assertNotPushed(PushInboundToAiJob::class);
});

test('a correctly signed delivery is accepted and queued', function () {
    Queue::fake();
    config(['services.meta.app_secret' => 'meta-app-secret']);
    $body = signedMetaDelivery();

    postMetaDelivery($this, $body, 'sha256='.hash_hmac('sha256', $body, 'meta-app-secret'))->assertOk();

    Queue::assertPushed(PushInboundToAiJob::class);
});

test('production refuses webhooks when no app secret is configured', function () {
    Queue::fake();
    config(['services.meta.app_secret' => null]);
    app()->detectEnvironment(fn () => 'production');

    postMetaDelivery($this, signedMetaDelivery(), signature: null)->assertStatus(401);

    Queue::assertNotPushed(PushInboundToAiJob::class);
});
