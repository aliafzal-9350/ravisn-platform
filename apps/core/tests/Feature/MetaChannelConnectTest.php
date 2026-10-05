<?php

use App\Models\ChannelIdentity;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/** A 1x1 PNG, as Meta's CDN would return for a profile picture. */
function tinyPng(): string
{
    return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function pagesResponse(array $pages): array
{
    return ['data' => $pages];
}

function page(string $id, string $name, ?array $instagram = null): array
{
    return array_filter([
        'id' => $id,
        'name' => $name,
        'category' => 'Clinic',
        'access_token' => "page-token-{$id}",
        'picture' => ['data' => ['url' => "https://scontent.xx.fbcdn.net/{$id}.png"]],
        'instagram_business_account' => $instagram,
    ]);
}

beforeEach(function () {
    Storage::fake('local');
    config(['services.meta.media_disk' => 'local', 'services.meta.app_id' => null, 'services.meta.app_secret' => null]);
    $this->user = User::factory()->for(Tenant::factory())->create();
});

test('a login that manages one page connects it with the page token and keeps a copy of its picture', function () {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([page('111', 'Smile Clinic')])),
        'scontent.xx.fbcdn.net/*' => Http::response(tinyPng(), 200, ['Content-Type' => 'image/png']),
    ]);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/messenger/token', ['access_token' => 'user-token'])
        ->assertOk()
        ->assertJsonPath('success', true);

    $channel = ChannelIdentity::forTenant($this->user->tenant_id)->where('channel_type', 'messenger')->first();
    expect($channel->external_id)->toBe('111')
        ->and($channel->access_token)->toBe('page-token-111')
        ->and($channel->settings)->not->toHaveKey('profile_picture_url')
        ->and($channel->settings['profile_picture_path'])->toStartWith("channel-avatars/{$this->user->tenant_id}/messenger-");

    Storage::disk('local')->assertExists($channel->settings['profile_picture_path']);

    $this->actingAs($this->user)->get($channel->avatarUrl())
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png');
});

test('a login that manages several pages asks which one, and connects the chosen one', function () {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([page('111', 'Smile Clinic'), page('222', 'Smile Dental')])),
        'scontent.xx.fbcdn.net/*' => Http::response(tinyPng(), 200, ['Content-Type' => 'image/png']),
    ]);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/messenger/token', ['access_token' => 'user-token'])
        ->assertStatus(422)
        ->assertJsonCount(2, 'choices')
        ->assertJsonPath('choices.1', ['id' => '222', 'label' => 'Smile Dental']);

    expect(ChannelIdentity::forTenant($this->user->tenant_id)->count())->toBe(0);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/messenger/token', ['access_token' => 'user-token', 'external_id' => '222'])
        ->assertOk();

    $channel = ChannelIdentity::forTenant($this->user->tenant_id)->where('channel_type', 'messenger')->first();
    expect($channel->external_id)->toBe('222')->and($channel->access_token)->toBe('page-token-222');
});

test('instagram connects the account linked to a page, using that page\'s token', function () {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([
            page('111', 'No Instagram Page'),
            page('222', 'Smile Clinic', ['id' => '178400', 'username' => 'smileclinic', 'profile_picture_url' => 'https://scontent.cdninstagram.com/p.png']),
        ])),
        'scontent.cdninstagram.com/*' => Http::response(tinyPng(), 200, ['Content-Type' => 'image/png']),
    ]);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/instagram/token', ['access_token' => 'user-token'])
        ->assertOk();

    $channel = ChannelIdentity::forTenant($this->user->tenant_id)->where('channel_type', 'instagram')->first();
    expect($channel->external_id)->toBe('178400')
        ->and($channel->account_name)->toBe('smileclinic')
        ->and($channel->business_account_id)->toBe('222')
        ->and($channel->access_token)->toBe('page-token-222')
        ->and($channel->settings)->toHaveKey('profile_picture_path');
});

test('whatsapp connects the one shared number with values reported by Meta', function () {
    Http::fake([
        '*/me/client_whatsapp_business_accounts*' => Http::response(['data' => [['id' => 'waba-1']]]),
        '*/waba-1/phone_numbers*' => Http::response(['data' => [['id' => '5550001', 'display_phone_number' => '+1 555 0001', 'verified_name' => 'Smile Clinic']]]),
        '*/5550001/whatsapp_business_profile*' => Http::response(['data' => [[]]]),
        '*/5550001*' => Http::response(['id' => '5550001', 'quality_rating' => 'green', 'messaging_limit_tier' => 'TIER_1K']),
    ]);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/whatsapp/token', ['access_token' => 'user-token'])
        ->assertOk();

    $channel = ChannelIdentity::forTenant($this->user->tenant_id)->where('channel_type', 'whatsapp')->first();
    expect($channel->external_id)->toBe('5550001')
        ->and($channel->business_account_id)->toBe('waba-1')
        ->and($channel->settings['quality_rating'])->toBe('GREEN')
        ->and($channel->settings['messaging_limit'])->toBe('TIER_1K');
});

test('nothing reachable is refused instead of saving a made-up account id', function (string $channelType, string $phrase) {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([])),
        '*/me/client_whatsapp_business_accounts*' => Http::response(['data' => []]),
    ]);

    $this->actingAs($this->user)
        ->postJson("/dashboard/connect/{$channelType}/token", ['access_token' => 'user-token'])
        ->assertStatus(422)
        ->assertJsonPath('choices', [])
        ->assertJsonFragment(['success' => false]);

    expect(ChannelIdentity::forTenant($this->user->tenant_id)->count())->toBe(0);
    expect($this->actingAs($this->user)->postJson("/dashboard/connect/{$channelType}/token", ['access_token' => 'user-token'])->json('message'))
        ->toContain($phrase);
})->with([
    ['whatsapp', 'Connect manually'],
    ['messenger', 'does not manage any Facebook Page'],
    ['instagram', 'linked Instagram'],
]);

test('the short-lived login token is exchanged for a long-lived one before use', function () {
    config(['services.meta.app_id' => 'app-id', 'services.meta.app_secret' => 'app-secret']);
    Http::fake([
        '*/oauth/access_token*' => Http::response(['access_token' => 'long-lived-token']),
        '*/debug_token*' => Http::response(['data' => ['granular_scopes' => []]]),
        '*/me/accounts*' => Http::response(pagesResponse([page('111', 'Smile Clinic')])),
        'scontent.xx.fbcdn.net/*' => Http::response(tinyPng(), 200, ['Content-Type' => 'image/png']),
    ]);

    $this->actingAs($this->user)
        ->postJson('/dashboard/connect/messenger/token', ['access_token' => 'short-token'])
        ->assertOk();

    Http::assertSent(fn ($request) => str_contains($request->url(), '/me/accounts')
        && $request->header('Authorization') === ['Bearer long-lived-token']);
});

test('pictures are only fetched from Meta\'s own image hosts and must be images', function () {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([
            array_merge(page('111', 'Smile Clinic'), ['picture' => ['data' => ['url' => 'https://169.254.169.254/latest/meta-data']]]),
        ])),
    ]);

    $this->actingAs($this->user)->postJson('/dashboard/connect/messenger/token', ['access_token' => 'user-token'])->assertOk();

    $channel = ChannelIdentity::forTenant($this->user->tenant_id)->where('channel_type', 'messenger')->first();
    expect($channel->settings)->not->toHaveKey('profile_picture_path');
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '169.254.169.254'));
});

test('a channel picture is only served to its own workspace', function () {
    Http::fake([
        '*/me/accounts*' => Http::response(pagesResponse([page('111', 'Smile Clinic')])),
        'scontent.xx.fbcdn.net/*' => Http::response(tinyPng(), 200, ['Content-Type' => 'image/png']),
    ]);
    $this->actingAs($this->user)->postJson('/dashboard/connect/messenger/token', ['access_token' => 'user-token'])->assertOk();

    $stranger = User::factory()->for(Tenant::factory())->create();

    $this->actingAs($stranger)->get('/dashboard/connect/messenger/avatar')->assertNotFound();
});
