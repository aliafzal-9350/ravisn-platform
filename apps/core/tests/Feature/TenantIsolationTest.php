<?php

use App\Broadcasting\KnowledgeIngestionChannel;
use App\Broadcasting\TenantInboxChannel;
use App\Broadcasting\ThreadChannel;
use App\Jobs\PushInboundToAiJob;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeIngestionJob;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use App\Models\User;
use App\Models\WhatsappAccount;
use App\Services\Inbox\InboundChannelResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

/**
 * Builds a complete, independent tenant: user, WhatsApp account/channel,
 * a customer, a conversation and one inbound message.
 */
function tenantWorld(string $name, string $phoneId): object
{
    $tenant = Tenant::create(['name' => $name, 'email' => strtolower($name).'@example.com', 'status' => 'active']);

    $user = User::create([
        'name' => $name.' Owner',
        'email' => strtolower($name).'-owner@example.com',
        'password' => bcrypt('password'),
        'role' => 'client',
        'tenant_id' => $tenant->id,
    ]);

    WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number' => '+1555000'.substr($phoneId, -4),
        'phone_number_id' => $phoneId,
        'waba_id' => 'waba-'.$phoneId,
        'access_token' => 'token-'.$name,
        'status' => 'active',
    ]);

    $channel = ChannelIdentity::create([
        'tenant_id' => $tenant->id,
        'channel_type' => 'whatsapp',
        'account_name' => $name.' WhatsApp',
        'external_id' => $phoneId,
        'access_token' => 'token-'.$name,
        'webhook_verify_token' => 'verify-'.$name,
        'is_active' => true,
    ]);

    $contact = Contact::create([
        'tenant_id' => $tenant->id,
        'phone' => '+1444'.substr($phoneId, -6),
        'phone_number' => '+1444'.substr($phoneId, -6),
        'name' => $name.' Customer',
        'last_inbound_at' => now(),
    ]);

    $thread = Thread::create([
        'contact_id' => $contact->id,
        'channel_identity_id' => $channel->id,
        'channel_type' => 'whatsapp',
        'status' => 'open',
        'bot_active' => true,
        'last_message_at' => now(),
    ]);

    $message = Message::create([
        'thread_id' => $thread->id,
        'contact_id' => $contact->id,
        'direction' => 'inbound',
        'channel_type' => 'whatsapp',
        'message_type' => 'text',
        'content' => 'Secret of '.$name,
        'status' => 'received',
    ]);

    return (object) compact('tenant', 'user', 'channel', 'contact', 'thread', 'message');
}

beforeEach(function () {
    $this->a = tenantWorld('Alpha', '1000000001');
    $this->b = tenantWorld('Bravo', '2000000002');
});

// ------------------------------------------------------------ authentication

test('the inbox, contact and thread APIs reject unauthenticated callers', function (string $method, string $uri) {
    $this->json($method, str_replace('{thread}', $this->a->thread->id, $uri))->assertUnauthorized();
})->with([
    ['GET', '/api/v1/threads'],
    ['GET', '/api/v1/inbox'],
    ['GET', '/api/v1/threads/{thread}'],
    ['GET', '/api/v1/inbox/threads/{thread}'],
    ['POST', '/api/v1/threads/{thread}/messages'],
    ['POST', '/api/v1/threads/{thread}/toggle-bot'],
    ['PUT', '/api/v1/contacts/1'],
    ['POST', '/api/v1/channels/sync'],
]);

// ------------------------------------------------------------ thread isolation

test('a tenant only lists its own threads', function () {
    $ids = $this->actingAs($this->a->user)->getJson('/api/v1/threads')->assertOk()->json('data.*.id');

    expect($ids)->toBe([(string) $this->a->thread->id]);
});

test('a tenant cannot read another tenant\'s thread', function () {
    $this->actingAs($this->a->user)->getJson("/api/v1/threads/{$this->b->thread->id}")->assertNotFound();
    $this->actingAs($this->a->user)->getJson("/api/v1/inbox/threads/{$this->b->thread->id}")->assertNotFound();
    $this->actingAs($this->a->user)->getJson("/api/v1/threads/{$this->b->thread->id}/messages")->assertNotFound();
});

test('a tenant can read its own thread', function () {
    $this->actingAs($this->a->user)
        ->getJson("/api/v1/threads/{$this->a->thread->id}")
        ->assertOk()
        ->assertJsonPath('messages.0.content', 'Secret of Alpha');
});

test('a tenant cannot send into another tenant\'s thread', function () {
    $this->actingAs($this->a->user)
        ->postJson("/api/v1/threads/{$this->b->thread->id}/messages", ['content' => 'hijack'])
        ->assertNotFound();

    expect(Message::where('content', 'hijack')->exists())->toBeFalse();
});

test('a tenant cannot toggle the bot of another tenant\'s thread', function () {
    $this->actingAs($this->a->user)
        ->postJson("/api/v1/threads/{$this->b->thread->id}/toggle-bot", ['bot_active' => false])
        ->assertNotFound();

    expect($this->b->thread->fresh()->bot_active)->toBeTrue();
});

test('a tenant cannot edit another tenant\'s contact', function () {
    $this->actingAs($this->a->user)
        ->putJson("/api/v1/contacts/{$this->b->contact->id}", ['name' => 'Hacked'])
        ->assertNotFound();

    expect($this->b->contact->fresh()->name)->toBe('Bravo Customer');
});

test('a manual reply records the human takeover status', function () {
    $this->actingAs($this->a->user)
        ->postJson("/api/v1/threads/{$this->a->thread->id}/messages", ['content' => 'On it'])
        ->assertCreated();

    $thread = $this->a->thread->fresh();
    expect($thread->bot_active)->toBeFalse()->and($thread->status)->toBe('human_takeover');
});

test('a user without a workspace is denied instead of seeing anything', function () {
    $orphan = User::create([
        'name' => 'Orphan', 'email' => 'orphan@example.com', 'password' => bcrypt('password'), 'role' => 'client',
    ]);

    $this->actingAs($orphan)->getJson('/api/v1/threads')->assertForbidden();
});

test('the inbox page only receives the tenant\'s own conversations', function () {
    $this->actingAs($this->a->user)
        ->get(route('client.inbox.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Chat/Inbox')
            ->has('threads', 1)
            ->where('threads.0.id', (string) $this->a->thread->id)
        );
});

test('the legacy takeover route is tenant scoped', function () {
    $this->actingAs($this->a->user)
        ->patchJson(route('client.threads.takeover', ['thread' => $this->b->thread->id]))
        ->assertNotFound();

    expect($this->b->thread->fresh()->bot_active)->toBeTrue();
});

// ------------------------------------------------------------ channels

test('the connect hub only shows the tenant\'s own channels', function () {
    $this->actingAs($this->a->user)
        ->get(route('client.connect.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('channels.whatsapp.phone_number_id', '1000000001')
        );
});

test('connecting an account another tenant already owns is refused', function () {
    $this->actingAs($this->a->user)
        ->post(route('client.connect.manual-link.whatsapp'), [
            'waba_id' => 'w', 'phone_number_id' => '2000000002', 'system_user_token' => 'x',
        ])
        ->assertStatus(422);

    expect($this->b->channel->fresh()->tenant_id)->toBe((string) $this->b->tenant->id);
});

test('connecting a channel never overwrites another tenant\'s channel', function () {
    $this->actingAs($this->a->user)
        ->post(route('client.connect.manual-link.whatsapp'), [
            'waba_id' => 'w-new', 'phone_number_id' => '3000000003', 'system_user_token' => 'x',
        ])
        ->assertRedirect();

    expect($this->b->channel->fresh()->external_id)->toBe('2000000002')
        ->and(ChannelIdentity::forTenant($this->a->tenant->id)->where('channel_type', 'whatsapp')->value('external_id'))->toBe('3000000003');
});

test('disconnecting and webhook-token changes only touch the tenant\'s own channels', function () {
    $this->actingAs($this->a->user)->delete(route('client.connect.disconnect', ['channel' => 'whatsapp']))->assertRedirect();
    $this->actingAs($this->a->user)->post(route('client.connect.webhook-token'), ['verify_token' => 'a-new-token-12345'])->assertRedirect();

    expect($this->a->channel->fresh()->is_active)->toBeFalse()
        ->and($this->b->channel->fresh()->is_active)->toBeTrue()
        ->and($this->b->channel->fresh()->webhook_verify_token)->toBe('verify-Bravo');
});

// ------------------------------------------------------------ broadcast authorization

test('broadcast channels are limited to the owning tenant', function () {
    $threadChannel = new ThreadChannel;
    $tenantChannel = new TenantInboxChannel;

    expect($threadChannel->join($this->a->user, (string) $this->a->thread->id))->toBeTrue()
        ->and($threadChannel->join($this->a->user, (string) $this->b->thread->id))->toBeFalse()
        ->and($threadChannel->join($this->a->user, 'not-a-uuid'))->toBeFalse()
        ->and($tenantChannel->join($this->a->user, (string) $this->a->tenant->id))->toBeTrue()
        ->and($tenantChannel->join($this->a->user, (string) $this->b->tenant->id))->toBeFalse();
});

test('there is no admin bypass on the tenant channel', function () {
    $this->a->user->forceFill(['role' => 'admin'])->save();

    expect((new TenantInboxChannel)->join($this->a->user, (string) $this->b->tenant->id))->toBeFalse();
});

test('a user without a tenant can join no tenant channel', function () {
    $orphan = User::create([
        'name' => 'Orphan', 'email' => 'orphan2@example.com', 'password' => bcrypt('password'), 'role' => 'client',
    ]);

    expect((new TenantInboxChannel)->join($orphan, 'default'))->toBeFalse()
        ->and((new ThreadChannel)->join($orphan, (string) $this->a->thread->id))->toBeFalse();
});

test('knowledge ingestion progress is visible only to the uploader', function () {
    $kb = KnowledgeBase::create(['name' => 'KB', 'embedding_model' => 'x', 'dimension' => 1536, 'is_active' => true]);
    $job = KnowledgeIngestionJob::create([
        'knowledge_base_id' => $kb->id,
        'uploaded_by_user_id' => $this->a->user->id,
        'title' => 't', 'original_filename' => 't.txt', 'status' => 'pending',
    ]);

    $channel = new KnowledgeIngestionChannel;
    expect($channel->join($this->a->user, (string) $job->id))->toBeTrue()
        ->and($channel->join($this->b->user, (string) $job->id))->toBeFalse();
});

// ------------------------------------------------------------ inbound attribution

test('the resolver maps a phone number to its tenant\'s channel and drops unknown numbers', function () {
    $resolver = new InboundChannelResolver;

    expect($resolver->resolve('whatsapp', '1000000001')->tenant_id)->toBe((string) $this->a->tenant->id)
        ->and($resolver->resolve('whatsapp', '9999999999'))->toBeNull()
        ->and($resolver->resolve('messenger', 'unknown-page'))->toBeNull()
        ->and(ChannelIdentity::where('external_id', '9999999999')->exists())->toBeFalse();
});

test('the resolver creates a channel from the tenant\'s own account, not a shared system token', function () {
    $account = WhatsappAccount::create([
        'tenant_id' => $this->a->tenant->id, 'phone_number' => '+1999', 'phone_number_id' => '4000000004',
        'waba_id' => 'w4', 'access_token' => 'tenant-a-own-token', 'status' => 'active',
    ]);

    $channel = (new InboundChannelResolver)->resolve('whatsapp', $account->phone_number_id);

    expect($channel->tenant_id)->toBe((string) $this->a->tenant->id)
        ->and($channel->access_token)->toBe('tenant-a-own-token');
});

test('inbound webhook traffic is attributed to the right tenant and stays isolated', function () {
    Queue::fake();

    $payload = [
        'object' => 'whatsapp_business_account',
        'entry' => [['id' => '1', 'changes' => [[
            'field' => 'messages',
            'value' => [
                'metadata' => ['phone_number_id' => '2000000002'],
                'messages' => [['from' => '15557778888', 'id' => 'wamid.ISO1', 'type' => 'text', 'text' => ['body' => 'hello bravo']]],
            ],
        ]]]],
    ];

    (new PushInboundToAiJob($payload))->handle();

    $contact = Contact::where('phone_number', '15557778888')->first();
    expect((string) $contact->tenant_id)->toBe((string) $this->b->tenant->id);

    $bravoThreads = $this->actingAs($this->b->user)->getJson('/api/v1/threads')->json('data.*.contact.phone_number');
    $alphaThreads = $this->actingAs($this->a->user)->getJson('/api/v1/threads')->json('data.*.contact.phone_number');

    expect($bravoThreads)->toContain('15557778888')->and($alphaThreads)->not->toContain('15557778888');
});

test('an inbound message for an unknown number is dropped without creating any data', function () {
    $before = Contact::count();

    (new PushInboundToAiJob([
        'entry' => [['changes' => [[
            'value' => [
                'metadata' => ['phone_number_id' => '8888888888'],
                'messages' => [['from' => '15550009999', 'id' => 'wamid.UNKNOWN', 'type' => 'text', 'text' => ['body' => 'hi']]],
            ],
        ]]]],
    ]))->handle();

    expect(Contact::count())->toBe($before)->and(Message::where('external_message_id', 'wamid.UNKNOWN')->exists())->toBeFalse();
});

test('a caption-less media message is stored instead of crashing the job', function () {
    Queue::fake();

    (new PushInboundToAiJob([
        'entry' => [['changes' => [[
            'value' => [
                'metadata' => ['phone_number_id' => '1000000001'],
                'messages' => [['from' => '15551110000', 'id' => 'wamid.IMG1', 'type' => 'image', 'image' => ['id' => 'media-1', 'mime_type' => 'image/jpeg']]],
            ],
        ]]]],
    ]))->handle();

    $message = Message::where('external_message_id', 'wamid.IMG1')->first();
    expect($message)->not->toBeNull()->and($message->message_type)->toBe('image');
});

test('the same inbound message is never processed twice', function () {
    $payload = [
        'entry' => [['changes' => [[
            'value' => [
                'metadata' => ['phone_number_id' => '1000000001'],
                'messages' => [['from' => '15552220000', 'id' => 'wamid.ONCE', 'type' => 'text', 'text' => ['body' => 'once']]],
            ],
        ]]]],
    ];

    (new PushInboundToAiJob($payload))->handle();
    (new PushInboundToAiJob($payload))->handle();

    expect(Message::where('external_message_id', 'wamid.ONCE')->count())->toBe(1);
});
