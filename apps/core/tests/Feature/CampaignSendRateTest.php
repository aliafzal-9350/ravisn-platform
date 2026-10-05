<?php

use App\Jobs\SendCampaignMessage;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    $tenant = Tenant::factory()->create();
    $this->account = WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number_id' => 'phone-'.uniqid(),
        'access_token' => 'token',
        'status' => 'active',
    ]);
    $this->campaign = Campaign::create([
        'tenant_id' => $tenant->id,
        'whatsapp_account_id' => $this->account->id,
        'message_type' => 'direct',
        'direct_message_body' => 'Our clinic is open on Sunday.',
        'name' => 'Sunday hours',
        'status' => 'processing',
        'total_recipients' => 1,
    ]);
    $this->recipient = CampaignRecipient::create([
        'campaign_id' => $this->campaign->id,
        'phone_number' => '+15557654321',
        'status' => 'pending',
    ]);
});

function sendJob(object $test): SendCampaignMessage
{
    return (new SendCampaignMessage($test->campaign, $test->recipient))->withFakeQueueInteractions();
}

test('Meta\'s rate limit puts the message back on the queue instead of failing it', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['code' => 130429, 'message' => 'Rate limit hit']], 400)]);

    $job = sendJob($this);
    $job->handle(app(WhatsAppCloudApi::class));

    $job->assertReleased(30);
    expect($this->recipient->fresh()->status)->toBe('pending');
});

test('a number with no free send slot waits its turn without calling Meta', function () {
    config(['whatsapp.rate_limit.messages_per_second' => 1, 'whatsapp.rate_limit.slot_wait_seconds' => 0]);
    Http::fake();

    // Another campaign on the same number just used this second's only slot.
    Redis::throttle('whatsapp-send:'.$this->account->id)->allow(1)->every(1)->then(fn () => true);

    $job = sendJob($this);
    $job->handle(app(WhatsAppCloudApi::class));

    $job->assertReleased(2);
    Http::assertNothingSent();
});

test('a message out of retries is recorded as failed and the campaign still completes', function () {
    (new SendCampaignMessage($this->campaign, $this->recipient))->failed(new RuntimeException('Meta unreachable'));

    expect($this->recipient->fresh())
        ->status->toBe('failed')
        ->error_message->toBe('Meta unreachable')
        ->and($this->campaign->fresh())
        ->status->toBe('completed')
        ->failed_count->toBe(1);
});

test('genuine errors are limited, waiting is not', function () {
    $job = new SendCampaignMessage($this->campaign, $this->recipient);

    expect($job->maxExceptions)->toBe(3)
        ->and($job->retryUntil())->toBeGreaterThan(now()->addHours(5));
});

test('a permanent Meta error fails the recipient at once instead of retrying', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['code' => 131026, 'message' => 'Message undeliverable']], 400)]);

    $job = sendJob($this);
    $job->handle(app(WhatsAppCloudApi::class));

    $job->assertNotReleased();
    expect($this->recipient->fresh())
        ->status->toBe('failed')
        ->error_message->toContain('Message undeliverable');
});

test('a Meta outage is retried rather than recorded as failed', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Service unavailable']], 503)]);

    expect(fn () => sendJob($this)->handle(app(WhatsAppCloudApi::class)))->toThrow(Illuminate\Http\Client\RequestException::class);
    expect($this->recipient->fresh()->status)->toBe('pending');
});
