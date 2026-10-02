<?php

use App\Jobs\ProcessWhatsAppWebhookEvent;
use App\Jobs\PushInboundToAiJob;
use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->tenant = Tenant::create(['name' => 'Clinic', 'email' => 'clinic@example.com', 'status' => 'active']);

    WhatsappAccount::create([
        'tenant_id' => $this->tenant->id,
        'phone_number' => '+15550001234',
        'phone_number_id' => '555000123',
        'waba_id' => 'waba-555',
        'access_token' => 'clinic-token',
        'app_secret' => 'clinic-app-secret',
        'status' => 'active',
    ]);
});

/**
 * POST a payload to the tenant's legacy webhook URL, signed like Meta does.
 */
function postLegacyWebhook(object $test, array $payload, ?string $secret = 'clinic-app-secret')
{
    $body = json_encode($payload);
    $server = ['CONTENT_TYPE' => 'application/json'];
    if ($secret !== null) {
        $server['HTTP_X_HUB_SIGNATURE_256'] = 'sha256='.hash_hmac('sha256', $body, $secret);
    }

    return $test->call('POST', "/webhook/whatsapp/{$test->tenant->webhook_token}", [], [], [], $server, $body);
}

function legacyMessagePayload(): array
{
    return [
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => 'waba-555', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => '555000123'],
                'contacts' => [['wa_id' => '15559990000', 'profile' => ['name' => 'Patient']]],
                'messages' => [['from' => '15559990000', 'id' => 'wamid.'.Str::random(16), 'type' => 'text', 'text' => ['body' => 'How much is a cleaning?']]],
            ],
        ]]]],
    ];
}

test('a customer message is acknowledged at once and handed to the tenant\'s own agent', function () {
    Queue::fake();
    Http::fake();

    postLegacyWebhook($this, legacyMessagePayload())->assertOk();

    Queue::assertPushed(ProcessWhatsAppWebhookEvent::class);
    Queue::assertPushed(PushInboundToAiJob::class);

    // Nothing ran inline: no AI provider or Meta call, and no reply written.
    Http::assertNothingSent();
    expect(WhatsappMessage::count())->toBe(0);
});

test('a delivery receipt updates bookkeeping but never queues an AI reply', function () {
    Queue::fake();

    postLegacyWebhook($this, [
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => 'waba-555', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => '555000123'],
                'statuses' => [['id' => 'wamid.'.Str::random(16), 'status' => 'delivered', 'timestamp' => (string) now()->timestamp]],
            ],
        ]]]],
    ])->assertOk();

    Queue::assertPushed(ProcessWhatsAppWebhookEvent::class);
    Queue::assertNotPushed(PushInboundToAiJob::class);
});

test('an unsigned or wrongly signed delivery is rejected and nothing is queued', function () {
    Queue::fake();

    postLegacyWebhook($this, legacyMessagePayload(), secret: null)->assertForbidden();
    postLegacyWebhook($this, legacyMessagePayload(), secret: 'not-the-secret')->assertForbidden();

    Queue::assertNothingPushed();
});
