<?php

use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Jobs\PushInboundToAiJob;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    Http::fake([
        'https://graph.facebook.com/*' => Http::response([
            'messaging_product' => 'whatsapp',
            'contacts' => [['input' => '123', 'wa_id' => '123']],
            'messages' => [['id' => 'wamid.HBgLMTIz']],
        ], 200),
    ]);

    $this->tenant = Tenant::create([
        'name' => 'RAVISN Test Tenant',
        'email' => 'test@ravisn.com',
        'status' => 'active',
        'ai_strategy' => 'lead_qualifier',
    ]);

    $this->user = User::factory()->create([
        'tenant_id' => $this->tenant->id,
    ]);

    $this->account = WhatsappAccount::create([
        'tenant_id' => $this->tenant->id,
        'phone_number' => '+15642226889',
        'phone_number_id' => '123456789',
        'waba_id' => '987654321',
        'access_token' => 'dummy_token',
        'status' => 'active',
    ]);

    $this->chat = WhatsappChat::create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'customer_phone' => '+19998887777',
        'customer_name' => 'Test Lead',
        'is_ai_active' => true,
    ]);
});

test('tenant active strategy update works', function () {
    $response = $this->actingAs($this->user)
        ->put(route('client.automations.strategy'), [
            'strategy' => 'faq_responder',
        ]);

    $response->assertRedirect(route('client.automations.index'));
    expect($this->tenant->fresh()->ai_strategy)->toBe('faq_responder');
});

test('human staff sending inbox message auto-pauses AI for chat', function () {
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Hello',
        'sent_at' => now(),
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('client.inbox.send', $this->chat->id), [
            'type' => 'text',
            'body' => 'Hello, how can I help you today?',
        ]);

    $response->assertOk();
    expect($this->chat->fresh()->is_ai_active)->toBeFalse();
});

test('resume AI assistant toggles is_ai_active to true', function () {
    $this->chat->update(['is_ai_active' => false]);

    $response = $this->actingAs($this->user)
        ->post(route('client.inbox.toggle-ai', $this->chat->id), [
            'is_ai_active' => true,
        ]);

    $response->assertOk();
    expect($this->chat->fresh()->is_ai_active)->toBeTrue();
});

test('the AI stays silent for a workspace in pure manual mode', function () {
    $this->tenant->update(['ai_strategy' => 'pure_manual']);

    $streamKey = 'test_inbound_ai_jobs';
    config(['services.meta.inbound_ai_stream_key' => $streamKey]);
    Redis::connection('bridge')->del($streamKey);

    (new PushInboundToAiJob([
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => '1', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => '123456789'],
                'messages' => [['from' => '19998887777', 'id' => 'wamid.MANUAL'.uniqid(), 'type' => 'text', 'text' => ['body' => 'Hi, are you open today?']]],
            ],
        ]]]],
    ]))->handle();

    // The message still reaches the inbox for a human, but no AI reply is queued.
    expect(Message::where('content', 'Hi, are you open today?')->exists())->toBeTrue()
        ->and(Redis::connection('bridge')->llen($streamKey))->toBe(0);
});
