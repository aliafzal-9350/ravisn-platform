<?php

use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Services\AI\RavisnAiService;
use Illuminate\Support\Facades\Http;

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

test('ravisn ai service enforces zero pricing guardrail', function () {
    $aiService = new RavisnAiService;
    $reply = $aiService->processIncomingMessage($this->chat, 'How much does it cost? What is your price?');

    expect($reply)->toContain('Every business is unique, so our pricing depends on your specific workflows');
});

test('ravisn ai service lead qualifier 2 turn handover flow', function () {
    $aiService = new RavisnAiService;

    // Turn 1: Customer sends inbound message
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'I need automation for my clinic',
    ]);
    $reply1 = $aiService->processIncomingMessage($this->chat, 'I need automation for my clinic');
    expect($reply1)->toContain('Welcome to RAVISN!');

    // Turn 2: Customer sends second inbound message
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Clinic lead appointment reminders',
    ]);
    $reply2 = $aiService->processIncomingMessage($this->chat, 'Clinic lead appointment reminders');
    expect($reply2)->toContain('May I know your name and the name of your business');

    // Turn 3: Customer provides details / consultation offer
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'My name is John from Smiles Clinic',
    ]);
    $reply3 = $aiService->processIncomingMessage($this->chat, 'My name is John from Smiles Clinic');
    expect($reply3)->toContain('Would you like our team to reach out for a free consultation');

    // Turn 4: Customer agrees to consultation -> triggers handover
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Yes please, reach out',
    ]);
    $replyHandover = $aiService->processIncomingMessage($this->chat, 'Yes please, reach out');
    expect($replyHandover)->toContain('Awesome! Our team has been notified');
    expect($replyHandover)->toContain('[TRIGGER: HUMAN_HANDOVER]');
    expect($this->chat->fresh()->is_ai_active)->toBeFalse();
});

test('ravisn ai service invokes google gemini api when key is set', function () {
    config(['services.gemini.key' => 'test_gemini_key_123']);

    Http::fake([
        'https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => 'RAVISN provides custom AI Voice Agents and Chatbots to automate clinic appointments 24/7!'],
                        ],
                    ],
                ],
            ],
        ], 200),
        'https://graph.facebook.com/*' => Http::response([], 200),
    ]);

    $aiService = new RavisnAiService;
    $reply = $aiService->processIncomingMessage($this->chat, 'Do you support custom AI Voice Agents for dental clinics?');

    expect($reply)->toContain('RAVISN provides custom AI Voice Agents');
});
