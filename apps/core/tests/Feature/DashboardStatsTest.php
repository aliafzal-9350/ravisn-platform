<?php

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappChat;
use App\Models\WhatsappMessage;
use App\Services\WhatsApp\WebhookHandler;

test('dashboard stats count all message sources correctly', function () {
    $tenant = Tenant::create([
        'name' => 'Stats Test Tenant',
        'email' => 'stats@test.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'role' => 'client',
    ]);

    $account = WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number_id' => 'test_phone_id',
        'phone_number' => '+1234567890',
        'display_name' => 'Test Business',
        'waba_id' => 'waba_test',
        'status' => 'active',
    ]);

    $chat = WhatsappChat::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $account->id,
        'customer_phone' => '+12125550198',
        'customer_name' => 'Test Customer',
        'last_message_at' => now(),
    ]);

    // Create outbound sent messages (inbox/API)
    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'text',
        'body' => 'Hello from inbox',
        'meta_message_id' => 'msg_001',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'template',
        'body' => 'Template message',
        'meta_message_id' => 'msg_002',
        'status' => 'delivered',
        'sent_at' => now(),
    ]);

    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'text',
        'body' => 'Read message',
        'meta_message_id' => 'msg_003',
        'status' => 'read',
        'sent_at' => now(),
    ]);

    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'text',
        'body' => 'Failed message',
        'meta_message_id' => 'msg_004',
        'status' => 'failed',
        'sent_at' => now(),
    ]);

    // Create inbound messages
    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Customer reply',
        'meta_message_id' => 'msg_in_001',
        'status' => 'delivered',
        'sent_at' => now(),
    ]);

    WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'inbound',
        'message_type' => 'text',
        'body' => 'Another reply',
        'meta_message_id' => 'msg_in_002',
        'status' => 'delivered',
        'sent_at' => now(),
    ]);

    $campaign = Campaign::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $account->id,
        'name' => 'Delivery Breakdown',
        'status' => 'completed',
        'total_recipients' => 5,
        'sent_count' => 5,
        'delivered_count' => 1,
        'failed_count' => 1,
        'read_count' => 1,
    ]);

    foreach (['delivered', 'read', 'failed', 'pending', 'sent'] as $status) {
        CampaignRecipient::create([
            'campaign_id' => $campaign->id,
            'phone_number' => '+1555000'.strlen($status),
            'status' => $status,
        ]);
    }

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('client/dashboard')
        ->has('stats')
        ->where('stats.totalMessagesSent', 4)   // 4 outbound
        ->where('stats.totalDelivered', 2)       // delivered + read
        ->where('stats.totalFailed', 1)          // 1 failed
        ->where('stats.totalReceived', 2)        // 2 inbound
        ->has('weeklyActivity', 7)
        ->where('weeklyActivity.6.sent', 4)
        ->where('weeklyActivity.6.delivered', 2)
        ->where('deliveryStatus.total', 5)
        ->where('deliveryStatus.delivered', 2)
        ->where('deliveryStatus.failed', 1)
        ->where('deliveryStatus.pending', 1)
        ->where('deliveryStatus.sent', 1)
        ->where('deliveryStatus.deliveryRate', 40)
        ->where('deliveryStatus.unresolvedRate', 60)
    );
});

test('webhook updates whatsapp_messages status on delivery receipt', function () {
    $tenant = Tenant::create([
        'name' => 'Webhook Test',
        'email' => 'webhook@test.com',
        'status' => 'active',
    ]);

    $account = WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number_id' => 'webhook_phone_id',
        'phone_number' => '+1234567890',
        'display_name' => 'Webhook Business',
        'waba_id' => 'waba_webhook',
        'status' => 'active',
    ]);

    $chat = WhatsappChat::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $account->id,
        'customer_phone' => '+12125550198',
        'customer_name' => 'Webhook Customer',
        'last_message_at' => now(),
    ]);

    $message = WhatsappMessage::create([
        'whatsapp_chat_id' => $chat->id,
        'direction' => 'outbound',
        'message_type' => 'text',
        'body' => 'Test message',
        'meta_message_id' => 'wamid.test_delivery',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    // Simulate webhook delivery status update
    $handler = app(WebhookHandler::class);
    $handler->handle([
        'entry' => [
            [
                'changes' => [
                    [
                        'field' => 'messages',
                        'value' => [
                            'statuses' => [
                                [
                                    'id' => 'wamid.test_delivery',
                                    'status' => 'delivered',
                                    'timestamp' => (string) now()->timestamp,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $message->refresh();
    expect($message->status)->toBe('delivered');
});
