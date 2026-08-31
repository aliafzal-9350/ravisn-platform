<?php

use App\Jobs\SendCampaignMessage;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\SystemNotification;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Services\WhatsApp\WebhookHandler;
use App\Services\WhatsApp\WhatsAppCloudApi;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create([
        'name' => 'Acme Corporation',
        'email' => 'acme@example.com',
        'status' => 'active',
    ]);

    $this->user = User::create([
        'name' => 'Owner',
        'email' => 'owner@example.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $this->tenant->id,
    ]);

    $this->account = WhatsappAccount::create([
        'tenant_id' => $this->tenant->id,
        'waba_id' => 'waba-123',
        'phone_number_id' => 'phone-123',
        'phone_number' => '+15550100',
        'display_name' => 'Main Support',
        'status' => 'active',
        'quality_rating' => 'GREEN',
    ]);

    $this->chat = WhatsappChat::create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'customer_phone' => '+15559999',
        'customer_name' => 'John Doe',
        'last_message_at' => now(),
    ]);
});

test('inbox blocks text message if no inbound message exists (session closed)', function () {
    $response = $this->actingAs($this->user)
        ->postJson(route('client.inbox.send', $this->chat), [
            'type' => 'text',
            'body' => 'Hello there',
        ]);

    $response->assertStatus(403);
    $response->assertJsonPath('error', 'The 24-hour free-text session window is closed. Please send a template message instead.');
});

test('inbox allows text message if inbound message is within 24 hours (session open)', function () {
    // Create an inbound message sent 5 hours ago
    $this->chat->messages()->create([
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Hi, I need help',
        'meta_message_id' => 'msg-inbound-1',
        'status' => 'delivered',
        'sent_at' => now()->subHours(5),
    ]);

    // Mock WhatsApp API response
    $whatsAppApi = $this->mock(WhatsAppCloudApi::class);
    $whatsAppApi->shouldReceive('sendTextMessage')
        ->once()
        ->with('phone-123', '+15559999', 'Hello there')
        ->andReturn(new Illuminate\Http\Client\Response(
            new Response(200, [], json_encode(['messages' => [['id' => 'wamid-outbound']]]))
        ));

    $response = $this->actingAs($this->user)
        ->postJson(route('client.inbox.send', $this->chat), [
            'type' => 'text',
            'body' => 'Hello there',
        ]);

    $response->assertOk();
    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_chat_id' => $this->chat->id,
        'direction' => 'outbound',
        'body' => 'Hello there',
        'meta_message_id' => 'wamid-outbound',
    ]);
});

test('campaign completed with failures creates a system notification', function () {
    $campaign = Campaign::create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'name' => 'Holiday Promo',
        'message_type' => 'direct',
        'direct_message_body' => 'Happy holidays!',
        'status' => 'processing',
        'total_recipients' => 1,
        'sent_count' => 0,
        'failed_count' => 0,
    ]);

    $recipient = CampaignRecipient::create([
        'campaign_id' => $campaign->id,
        'phone_number' => '+15558888',
        'status' => 'pending',
    ]);

    $whatsAppApi = $this->mock(WhatsAppCloudApi::class);
    $whatsAppApi->shouldReceive('sendTextMessage')
        ->once()
        ->andThrow(new Exception('Network error'));

    // Run the job which will catch the error, update status to failed, and trigger completion check
    app(SendCampaignMessage::class, [
        'campaign' => $campaign,
        'recipient' => $recipient,
    ])->handle($whatsAppApi);

    $this->assertDatabaseHas('system_notifications', [
        'tenant_id' => $this->tenant->id,
        'title' => 'فشل جزئي أو كلي في إرسال الحملة',
        'type' => 'error',
    ]);

    expect(SystemNotification::count())->toBe(1);
    expect(SystemNotification::first()->message)->toContain('Holiday Promo');
});

test('meta phone number quality webhook update to yellow or red triggers alert notification', function () {
    $handler = new WebhookHandler;

    $payload = [
        'entry' => [
            [
                'id' => 'waba-123',
                'changes' => [
                    [
                        'field' => 'phone_number_quality_update',
                        'value' => [
                            'phone_number_id' => 'phone-123',
                            'event' => 'QUALITY_UPDATE',
                            'previous_quality_rating' => 'GREEN',
                            'new_quality_rating' => 'RED',
                        ],
                    ],
                ],
            ],
        ],
    ];

    $handler->handle($payload);

    $this->chat->whatsappAccount->refresh();
    expect($this->chat->whatsappAccount->quality_rating)->toBe('RED');

    $this->assertDatabaseHas('system_notifications', [
        'tenant_id' => $this->tenant->id,
        'title' => 'حرج: انخفاض جودة الرقم إلى الأحمر',
        'type' => 'error',
    ]);
});
