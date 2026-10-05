<?php

use App\Jobs\PushInboundToAiJob;
use App\Services\Meta\WebhookEventDeduplicator;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

/**
 * @param  array<int, string>  $messageIds
 * @param  array<int, array{id: string, status: string}>  $statuses
 * @return array<string, mixed>
 */
function metaDelivery(array $messageIds, array $statuses = []): array
{
    $value = ['metadata' => ['phone_number_id' => '1000000001'], 'contacts' => [['wa_id' => '15551234567']]];

    if ($messageIds) {
        $value['messages'] = array_map(fn (string $id) => [
            'from' => '15551234567', 'id' => $id, 'type' => 'text', 'text' => ['body' => 'hi '.$id],
        ], $messageIds);
    }

    if ($statuses) {
        $value['statuses'] = $statuses;
    }

    return ['object' => 'whatsapp_business_account', 'entry' => [['id' => '1', 'changes' => [['field' => 'messages', 'value' => $value]]]]];
}

afterEach(function () {
    foreach (Redis::keys('meta_*') as $key) {
        // keys() returns fully-prefixed names; strip the connection prefix before deleting.
        Redis::del(Str::after($key, config('database.redis.options.prefix')));
    }
});

test('a single-event delivery is passed through completely untouched', function () {
    $delivery = metaDelivery(['wamid.'.Str::random(12)]);

    $units = (new WebhookEventDeduplicator)->split($delivery);

    expect($units)->toHaveCount(1)->and($units[0]['payload'])->toBe($delivery);
});

test('a batched delivery is split into one event per message', function () {
    $a = 'wamid.A'.Str::random(10);
    $b = 'wamid.B'.Str::random(10);

    $units = (new WebhookEventDeduplicator)->split(metaDelivery([$a, $b]));

    expect($units)->toHaveCount(2)
        ->and($units[0]['key'])->toBe('meta_msg_'.$a)
        ->and($units[1]['key'])->toBe('meta_msg_'.$b)
        ->and($units[0]['payload']['entry'][0]['changes'][0]['value']['messages'])->toHaveCount(1)
        ->and($units[0]['payload']['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'])->toBe('1000000001');
});

test('every message in a batched webhook is queued, not just the first', function () {
    Queue::fake();
    $ids = ['wamid.X'.Str::random(10), 'wamid.Y'.Str::random(10), 'wamid.Z'.Str::random(10)];

    $this->postJson('/api/v1/webhooks/meta', metaDelivery($ids))->assertOk();

    Queue::assertPushed(PushInboundToAiJob::class, 3);
});

test('a Meta retry of a batched delivery queues nothing and reports a duplicate', function () {
    Queue::fake();
    $delivery = metaDelivery(['wamid.R1'.Str::random(10), 'wamid.R2'.Str::random(10)]);

    $this->postJson('/api/v1/webhooks/meta', $delivery)->assertOk();
    $this->postJson('/api/v1/webhooks/meta', $delivery)->assertOk()->assertJson(['duplicate' => true]);

    Queue::assertPushed(PushInboundToAiJob::class, 2);
});

test('a retry that adds one new message only queues the new one', function () {
    Queue::fake();
    $old = 'wamid.OLD'.Str::random(10);
    $new = 'wamid.NEW'.Str::random(10);

    $this->postJson('/api/v1/webhooks/meta', metaDelivery([$old]))->assertOk();
    $this->postJson('/api/v1/webhooks/meta', metaDelivery([$old, $new]))->assertOk();

    Queue::assertPushed(PushInboundToAiJob::class, 2);
});

test('claiming an event is atomic: the second claim always loses', function () {
    $deduplicator = new WebhookEventDeduplicator;
    $delivery = metaDelivery(['wamid.ATOM'.Str::random(10)]);

    expect($deduplicator->newEvents($delivery))->toHaveCount(1)
        ->and($deduplicator->newEvents($delivery))->toBeEmpty();
});

test('claims expire so a lost key can never block an event forever', function () {
    $id = 'wamid.TTL'.Str::random(10);

    (new WebhookEventDeduplicator)->newEvents(metaDelivery([$id]));

    $ttl = Redis::ttl('meta_msg_'.$id);
    expect($ttl)->toBeGreaterThan(0)->and($ttl)->toBeLessThanOrEqual(86400);
});

test('status updates are de-duplicated per message and status', function () {
    $deduplicator = new WebhookEventDeduplicator;
    $id = 'wamid.ST'.Str::random(10);

    $delivered = metaDelivery([], [['id' => $id, 'status' => 'delivered']]);
    $read = metaDelivery([], [['id' => $id, 'status' => 'read']]);

    expect($deduplicator->newEvents($delivered))->toHaveCount(1)
        ->and($deduplicator->newEvents($delivered))->toBeEmpty()
        ->and($deduplicator->newEvents($read))->toHaveCount(1);
});

test('a failed job releases its claim so Meta\'s retry is processed', function () {
    $delivery = metaDelivery(['wamid.FAIL'.Str::random(10)]);
    $deduplicator = new WebhookEventDeduplicator;

    $event = $deduplicator->newEvents($delivery)[0];
    expect($deduplicator->newEvents($delivery))->toBeEmpty();

    (new PushInboundToAiJob($event['payload'], $event['redis_key']))->failed(new RuntimeException('boom'));

    expect($deduplicator->newEvents($delivery))->toHaveCount(1);
});

test('messenger events are split and keyed by their message id', function () {
    $mid = 'm_'.Str::random(10);

    $units = (new WebhookEventDeduplicator)->split([
        'object' => 'page',
        'entry' => [['id' => 'page1', 'messaging' => [
            ['sender' => ['id' => 's1'], 'message' => ['mid' => $mid, 'text' => 'a']],
            ['sender' => ['id' => 's2'], 'message' => ['mid' => 'm_other', 'text' => 'b']],
        ]]],
    ]);

    expect($units)->toHaveCount(2)->and($units[0]['key'])->toBe('meta_msg_'.$mid);
});
