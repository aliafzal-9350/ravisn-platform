<?php

use App\Jobs\PushInboundToAiJob;
use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Tenant;
use App\Models\Thread;
use App\Services\AI\AiJobQueue;
use Illuminate\Support\Str;

beforeEach(function () {
    config(['services.meta.inbound_ai_stream' => 'test:ai:inbound']);
    app(AiJobQueue::class)->clear();
    $this->tenant = Tenant::factory()->create();
});

afterEach(fn () => app(AiJobQueue::class)->clear());

function connectChannel(Tenant $tenant, string $type, string $externalId): ChannelIdentity
{
    return ChannelIdentity::create([
        'tenant_id' => $tenant->id,
        'channel_type' => $type,
        'account_name' => "{$type} account",
        'external_id' => $externalId,
        'access_token' => 'page-token',
        'webhook_verify_token' => 'verify',
        'is_active' => true,
    ]);
}

function messagingDelivery(string $object, string $accountId, string $senderId): array
{
    return [
        'object' => $object,
        'entry' => [[
            'id' => $accountId,
            'time' => now()->timestamp,
            'messaging' => [[
                'sender' => ['id' => $senderId],
                'recipient' => ['id' => $accountId],
                'message' => ['mid' => 'mid.'.Str::random(12), 'text' => 'Hi, are you open today?'],
            ]],
        ]],
    ];
}

test('an Instagram DM is recorded as Instagram, not Messenger', function () {
    $channel = connectChannel($this->tenant, 'instagram', '17841400000001');

    (new PushInboundToAiJob(messagingDelivery('instagram', '17841400000001', 'igsid-555')))->handle();

    $thread = Thread::where('channel_identity_id', $channel->id)->firstOrFail();
    $contact = Contact::find($thread->contact_id);

    expect($thread->channel_type)->toBe('instagram')
        ->and($contact->instagram_igsid)->toBe('igsid-555')
        ->and($contact->messenger_psid)->toBeNull()
        ->and(app(AiJobQueue::class)->pending()[0]['channel'])->toBe('instagram');
});

test('a Facebook Page message is still recorded as Messenger', function () {
    $channel = connectChannel($this->tenant, 'messenger', '100200300');

    (new PushInboundToAiJob(messagingDelivery('page', '100200300', 'psid-777')))->handle();

    $thread = Thread::where('channel_identity_id', $channel->id)->firstOrFail();

    expect($thread->channel_type)->toBe('messenger')
        ->and(Contact::find($thread->contact_id)->messenger_psid)->toBe('psid-777');
});
