<?php

use App\Models\ApiKey;
use App\Models\MessageTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create([
        'name' => 'Test Tenant',
        'email' => 'test@example.com',
        'status' => 'active',
    ]);

    $this->user = User::create([
        'name' => 'Tenant Owner',
        'email' => 'owner@example.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $this->tenant->id,
    ]);

    $this->account = WhatsappAccount::create([
        'tenant_id' => $this->tenant->id,
        'waba_id' => 'waba-123',
        'phone_number_id' => '985357101336442',
        'phone_number' => '+15550100',
        'display_name' => 'Primary WhatsApp',
        'status' => 'active',
        'quality_rating' => 'GREEN',
    ]);

    $this->rawApiKey = 'zm_live_test_api_key_123';
    $this->apiKey = ApiKey::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Production Key',
        'key' => hash('sha256', $this->rawApiKey),
    ]);
});

test('api send-text succeeds for the mock number +12125550198', function () {
    Http::fake([
        '*' => Http::response([
            'messaging_product' => 'whatsapp',
            'contacts' => [['input' => '+12125550198', 'wa_id' => '12125550198']],
            'messages' => [['id' => 'wamid.MockMessageId12125550198.'.Str::random(16)]],
        ], 200),
    ]);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$this->rawApiKey,
        'Accept' => 'application/json',
    ])->postJson('/api/v1/messages/send-text', [
        'phone_number_id' => '985357101336442',
        'to' => '+12125550198',
        'body' => 'Hello, this is a test text message sent via RAVISN API!',
    ]);

    $response->assertOk();
    $messageId = $response->json('message_id');
    expect($messageId)->toStartWith('wamid.MockMessageId12125550198.');

    // Check database has created a chat
    $chat = WhatsappChat::where('customer_phone', '+12125550198')->first();
    expect($chat)->not->toBeNull();
    expect($chat->tenant_id)->toBe($this->tenant->id);

    // Check database has created a message
    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'body' => 'Hello, this is a test text message sent via RAVISN API!',
        'meta_message_id' => $messageId,
        'status' => 'sent',
    ]);
});

test('api send-template succeeds for the mock number +12125550198', function () {
    MessageTemplate::create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'name' => 'verification_code',
        'language' => 'en_US',
        'category' => 'UTILITY',
        'status' => 'approved',
        'components' => [
            [
                'type' => 'BODY',
                'text' => 'Your verification code is {{1}}. It expires in {{2}}.',
            ],
        ],
    ]);

    Http::fake([
        '*' => Http::response([
            'messaging_product' => 'whatsapp',
            'contacts' => [['input' => '+12125550198', 'wa_id' => '12125550198']],
            'messages' => [['id' => 'wamid.MockMessageId12125550198.'.Str::random(16)]],
        ], 200),
    ]);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$this->rawApiKey,
        'Accept' => 'application/json',
    ])->postJson('/api/v1/messages/send-template', [
        'phone_number_id' => '985357101336442',
        'to' => '+12125550198',
        'template_name' => 'verification_code',
        'language' => 'en_US',
        'variables' => ['123456', '5 minutes'],
    ]);

    $response->assertOk();
    $messageId = $response->json('message_id');
    expect($messageId)->toStartWith('wamid.MockMessageId12125550198.');

    // Check database has created a chat
    $chat = WhatsappChat::where('customer_phone', '+12125550198')->first();
    expect($chat)->not->toBeNull();

    // Check database has created a message
    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'template',
        'body' => 'Your verification code is 123456. It expires in 5 minutes.',
        'meta_message_id' => $messageId,
    ]);
});

test('message template correctly maps named parameters in getBodyParameters', function () {
    $template = MessageTemplate::create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'name' => 'student_attendance',
        'language' => 'ar',
        'category' => 'UTILITY',
        'status' => 'approved',
        'components' => [
            [
                'type' => 'BODY',
                'text' => 'تحية طيبة لولي أمر الطالب/ة {{student_name}} بتاريخ {{session_date}} كان {{attendance_status}}',
            ],
            [
                'type' => 'FOOTER',
                'text' => 'زاد إدو',
            ],
        ],
    ]);

    $values = ['عبدالمجيد صابر', '2026-05-30', 'حاضر'];
    $mapped = $template->getBodyParameters($values);

    expect($mapped)->toBe([
        [
            'type' => 'text',
            'text' => 'عبدالمجيد صابر',
            'parameter_name' => 'student_name',
        ],
        [
            'type' => 'text',
            'text' => '2026-05-30',
            'parameter_name' => 'session_date',
        ],
        [
            'type' => 'text',
            'text' => 'حاضر',
            'parameter_name' => 'attendance_status',
        ],
    ]);
});
