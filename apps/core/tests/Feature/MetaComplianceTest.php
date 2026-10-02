<?php

namespace Tests\Feature;

use App\Jobs\PushInboundToAiJob;
use App\Jobs\SendCampaignMessage;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\Tenant;
use App\Models\Thread;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class MetaComplianceTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected ChannelIdentity $channel;
    protected WhatsappAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Compliance Test Tenant',
            'email' => 'compliance@example.com',
            'status' => 'active',
        ]);

        $this->user = User::create([
            'name' => 'Agent Admin',
            'email' => 'agent@example.com',
            'password' => bcrypt('password'),
            'role' => 'client',
            'tenant_id' => $this->tenant->id,
        ]);

        $this->channel = ChannelIdentity::create([
            'tenant_id' => $this->tenant->id,
            'channel_type' => 'whatsapp',
            'account_name' => 'Support Channel',
            'external_id' => '1000999888777',
            'webhook_verify_token' => 'test_webhook_token_compliance',
            'access_token' => 'test_access_token',
            'is_active' => true,
        ]);

        $this->account = WhatsappAccount::create([
            'tenant_id' => $this->tenant->id,
            'waba_id' => 'waba-12345',
            'phone_number_id' => '1000999888777',
            'phone_number' => '+15559998888',
            'display_name' => 'Meta Compliance Bot',
            'status' => 'active',
            'quality_rating' => 'GREEN',
        ]);
    }

    /**
     * Task 1.1: Multi-Tenant Webhook Deduplication
     * Redis::setnx('meta_msg_' . $id, true) with 24-hour TTL drops retries immediately.
     */
    public function test_webhook_deduplication_drops_retried_messages(): void
    {
        Queue::fake();

        $msgId = 'wamid.HBgTESTDEDUP' . time();
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
                                    'phone_number_id' => '1000999888777',
                                ],
                                'messages' => [
                                    [
                                        'from' => '15551234567',
                                        'id' => $msgId,
                                        'timestamp' => (string) time(),
                                        'text' => [
                                            'body' => 'Need pricing information',
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

        // First attempt -> should be accepted and queued
        $response1 = $this->postJson('/api/v1/webhooks/meta', $payload);
        $response1->assertStatus(200);
        $response1->assertJson(['status' => 'EVENT_RECEIVED']);
        Queue::assertPushed(PushInboundToAiJob::class, 1);

        // Immediate retry with identical message ID -> should return 200 OK duplicate and NOT re-queue
        $response2 = $this->postJson('/api/v1/webhooks/meta', $payload);
        $response2->assertStatus(200);
        $response2->assertJson(['status' => 'EVENT_RECEIVED', 'duplicate' => true]);
        Queue::assertPushed(PushInboundToAiJob::class, 1); // Still exactly 1
    }

    /**
     * Task 1.2: Mandatory Opt-Out Logic
     * Regex-check inbound text strings for ^(stop|unsubscribe|cancel)$ (case-insensitive)
     * sets opted_out = true and dispatches an internal system message ("Customer opted out").
     */
    public function test_mandatory_opt_out_sets_flag_and_creates_system_message(): void
    {
        $senderPhone = '15559876543';
        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'metadata' => [
                                    'phone_number_id' => '1000999888777',
                                ],
                                'messages' => [
                                    [
                                        'from' => $senderPhone,
                                        'id' => 'wamid.OPTOUT_' . time(),
                                        'type' => 'text',
                                        'text' => ['body' => 'STOP'],
                                        'profile' => ['name' => 'Alice Customer'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        // Execute PushInboundToAiJob directly
        $job = new PushInboundToAiJob($payload);
        $job->handle();

        $contact = Contact::where('phone_number', $senderPhone)->first();
        $this->assertNotNull($contact);
        $this->assertTrue($contact->opted_out);
        $this->assertTrue($contact->is_opted_out);
        $this->assertNotNull($contact->last_inbound_at);

        $thread = Thread::where('contact_id', $contact->id)->first();
        $this->assertNotNull($thread);
        $this->assertFalse($thread->bot_active);

        // Internal system message dispatched to thread
        $this->assertDatabaseHas('messages', [
            'thread_id' => $thread->id,
            'contact_id' => $contact->id,
            'content' => 'Customer opted out',
        ]);
    }

    /**
     * Task 1.2: Bulk sends skip opted-out contacts
     */
    public function test_campaign_bulk_sends_skip_opted_out_contacts(): void
    {
        $optedOutContact = Contact::create([
            'tenant_id' => $this->tenant->id,
            'phone' => '+15557776666',
            'phone_number' => '+15557776666',
            'name' => 'Opted Out User',
            'opted_out' => true,
        ]);

        $campaign = Campaign::create([
            'tenant_id' => $this->tenant->id,
            'whatsapp_account_id' => $this->account->id,
            'name' => 'Promo Blast',
            'message_type' => 'direct',
            'direct_message_body' => 'Exclusive discounts today!',
            'status' => 'processing',
            'total_recipients' => 1,
            'sent_count' => 0,
            'failed_count' => 0,
        ]);

        $recipient = CampaignRecipient::create([
            'campaign_id' => $campaign->id,
            'phone_number' => '+15557776666',
            'status' => 'pending',
        ]);

        $whatsAppApi = $this->mock(WhatsAppCloudApi::class);
        $whatsAppApi->shouldNotReceive('sendTextMessage');

        $job = new SendCampaignMessage($campaign, $recipient);
        $job->handle($whatsAppApi);

        $recipient->refresh();
        $this->assertEquals('failed', $recipient->status);
        $this->assertEquals('Contact opted out.', $recipient->error_message);
        $this->assertEquals(1, $campaign->fresh()->failed_count);
    }

    /**
     * Task 1.3: Meta 24-Hour Window Enforcement (Error 131047)
     * If > 24 hours since last_inbound_at, block standard text payloads and throw
     * validation exception requiring registered Meta Template ID.
     */
    public function test_24_hour_window_blocks_text_payload_and_requires_template(): void
    {
        $contact = Contact::create([
            'tenant_id' => $this->tenant->id,
            'phone' => '+15554443333',
            'phone_number' => '+15554443333',
            'name' => 'Expired Customer',
            'last_inbound_at' => now()->subHours(25),
        ]);

        $thread = Thread::create([
            'contact_id' => $contact->id,
            'channel_identity_id' => $this->channel->id,
            'channel_type' => 'whatsapp',
            'status' => 'open',
            'bot_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/inbox/threads/{$thread->id}/messages", [
                'content' => 'Hello, are you still interested?',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['content', 'template_id']);
        $this->assertStringContainsString('Error 131047', $response->json('errors.content.0'));
    }

    /**
     * Task 1.3: Within 24-hour window, standard text message succeeds.
     */
    public function test_24_hour_window_allows_text_message_within_window(): void
    {
        $contact = Contact::create([
            'tenant_id' => $this->tenant->id,
            'phone' => '+15554442222',
            'phone_number' => '+15554442222',
            'name' => 'Active Customer',
            'last_inbound_at' => now()->subHours(2),
        ]);

        $thread = Thread::create([
            'contact_id' => $contact->id,
            'channel_identity_id' => $this->channel->id,
            'channel_type' => 'whatsapp',
            'status' => 'open',
            'bot_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/inbox/threads/{$thread->id}/messages", [
                'content' => 'Glad to assist you!',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'thread_id' => $thread->id,
            'contact_id' => $contact->id,
            'content' => 'Glad to assist you!',
            'direction' => 'outbound',
        ]);
    }

    /**
     * Task 1.3: Outside 24-hour window, sending an approved Meta Template ID succeeds.
     */
    public function test_24_hour_window_allows_template_message_outside_window(): void
    {
        $contact = Contact::create([
            'tenant_id' => $this->tenant->id,
            'phone' => '+15554441111',
            'phone_number' => '+15554441111',
            'name' => 'Re-engaged Customer',
            'last_inbound_at' => now()->subHours(48),
        ]);

        $thread = Thread::create([
            'contact_id' => $contact->id,
            'channel_identity_id' => $this->channel->id,
            'channel_type' => 'whatsapp',
            'status' => 'open',
            'bot_active' => true,
        ]);

        $template = MessageTemplate::create([
            'tenant_id' => $this->tenant->id,
            'whatsapp_account_id' => $this->account->id,
            'name' => 'appointment_reminder',
            'language' => 'en',
            'category' => 'UTILITY',
            'status' => 'APPROVED',
            'components' => [
                ['type' => 'BODY', 'text' => 'Hi {{1}}, this is a reminder for your upcoming booking.'],
            ],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/inbox/threads/{$thread->id}/messages", [
                'template_id' => (string) $template->id,
                'variables' => ['Alice'],
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'thread_id' => $thread->id,
            'contact_id' => $contact->id,
            'message_type' => 'template',
            'direction' => 'outbound',
        ]);
    }
}
