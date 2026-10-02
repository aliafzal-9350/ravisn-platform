<?php

use App\Models\ChannelIdentity;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappAccount;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

test('channel tokens are encrypted at rest and never serialised', function () {
    $tenant = Tenant::factory()->create();
    $channel = ChannelIdentity::create([
        'tenant_id' => $tenant->id,
        'channel_type' => 'whatsapp',
        'account_name' => 'Main line',
        'external_id' => '700000001',
        'access_token' => 'EAAG-channel-secret',
        'webhook_verify_token' => 'verify-me',
        'is_active' => true,
    ]);

    $stored = DB::table('channel_identities')->where('id', $channel->id)->value('access_token');

    expect($stored)->not->toContain('EAAG-channel-secret')
        ->and($channel->fresh()->access_token)->toBe('EAAG-channel-secret')
        ->and($channel->fresh()->toArray())->not->toHaveKeys(['access_token', 'webhook_verify_token']);
});

test('whatsapp account credentials are encrypted at rest', function () {
    $tenant = Tenant::factory()->create();
    $account = WhatsappAccount::create([
        'tenant_id' => $tenant->id,
        'phone_number_id' => '700000002',
        'access_token' => 'EAAG-account-secret',
        'app_secret' => str_repeat('a', 32),
        'status' => 'active',
    ]);

    $stored = DB::table('whatsapp_accounts')->where('id', $account->id)->first();

    expect($stored->access_token)->not->toContain('EAAG-account-secret')
        ->and($stored->app_secret)->not->toContain(str_repeat('a', 32))
        ->and($account->fresh()->app_secret)->toBe(str_repeat('a', 32))
        ->and($account->fresh()->toArray())->not->toHaveKeys(['access_token', 'app_secret']);
});

test('the migration encrypts plaintext credentials from older versions exactly once', function () {
    $tenant = Tenant::factory()->create();
    $id = DB::table('whatsapp_accounts')->insertGetId([
        'tenant_id' => (string) $tenant->id,
        'phone_number_id' => '700000003',
        'access_token' => 'EAAG-legacy-plaintext',
        'app_secret' => 'legacy-app-secret',
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $migration = require database_path('migrations/2026_10_02_000002_encrypt_channel_credentials.php');
    $migration->up();
    $once = DB::table('whatsapp_accounts')->where('id', $id)->value('access_token');
    $migration->up();
    $twice = DB::table('whatsapp_accounts')->where('id', $id)->value('access_token');

    $account = WhatsappAccount::find($id);
    expect($once)->not->toBe('EAAG-legacy-plaintext')
        ->and($twice)->toBe($once)
        ->and($account->access_token)->toBe('EAAG-legacy-plaintext')
        ->and($account->app_secret)->toBe('legacy-app-secret');
});

test('the whatsapp accounts page never sends credentials to the browser', function () {
    $user = User::factory()->for(Tenant::factory())->create();
    WhatsappAccount::create([
        'tenant_id' => $user->tenant_id,
        'phone_number_id' => '700000004',
        'access_token' => 'EAAG-page-secret',
        'app_secret' => 'page-app-secret',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->get('/dashboard/whatsapp-accounts');

    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->where('accounts.0.has_access_token', true)
        ->where('accounts.0.has_app_secret', true)
        ->missing('accounts.0.access_token')
        ->missing('accounts.0.app_secret'));

    expect($response->getContent())->not->toContain('EAAG-page-secret')
        ->and($response->getContent())->not->toContain('page-app-secret');
});
