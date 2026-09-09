<?php

use App\Models\ChannelIdentity;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware();

    $this->tenant = Tenant::create([
        'name' => 'Meta Test Workspace',
        'email' => 'meta-test@example.com',
        'status' => 'active',
    ]);

    $this->user = User::factory()->create([
        'tenant_id' => $this->tenant->id,
        'role' => 'client',
    ]);
});

test('channel connections hub defaults to clean disconnected state when no channels connected', function () {
    $this->actingAs($this->user)
        ->get(route('client.connect.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('client/connect/index')
            ->where('channels.whatsapp.is_connected', false)
            ->where('channels.whatsapp.status', 'Disconnected')
            ->where('channels.whatsapp.waba_id', '')
            ->where('channels.whatsapp.phone_number_id', '')
            ->where('channels.instagram.is_connected', false)
            ->where('channels.instagram.status', 'Disconnected')
            ->where('channels.messenger.is_connected', false)
            ->where('channels.messenger.status', 'Disconnected')
        );
});

test('channel connections page renders correctly with dynamic channel data', function () {
    ChannelIdentity::create([
        'channel_type' => 'whatsapp',
        'account_name' => '+1 564-222-6889',
        'external_id' => '5647382910842',
        'business_account_id' => '1092837465019',
        'access_token' => 'EAAG_test_token',
        'webhook_verify_token' => 'ravisn-verify-token-2026-prod',
        'is_active' => true,
        'settings' => [
            'verified_name' => 'RAVISN Technologies',
            'display_name' => 'RAVISN Official',
            'quality_rating' => 'GREEN (High Quality)',
            'messaging_limit' => '100k / 24 Hours (Tier 3)',
            'message_window' => 'Active (24h Standard)',
            'status' => 'Active & Verified',
        ],
    ]);

    $this->actingAs($this->user)
        ->get(route('client.connect.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('client/connect/index')
            ->has('channels.whatsapp')
            ->has('channels.instagram')
            ->has('channels.messenger')
            ->has('webhook')
            ->where('channels.whatsapp.is_connected', true)
            ->where('channels.whatsapp.waba_id', '1092837465019')
            ->where('channels.whatsapp.phone_number_id', '5647382910842')
            ->where('channels.whatsapp.verified_name', 'RAVISN Technologies')
        );
});

test('manual waba linkup upserts channel identity record and sets status active', function () {
    $response = $this->actingAs($this->user)
        ->post(route('client.connect.manual-link.whatsapp'), [
            'display_phone_number' => '+1 564-222-6889',
            'verified_name' => 'RAVISN Technologies',
            'waba_id' => '1092837465019',
            'phone_number_id' => '5647382910842',
            'system_user_token' => 'EAAG_mock_token_123',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('channel_identities', [
        'channel_type' => 'whatsapp',
        'external_id' => '5647382910842',
        'business_account_id' => '1092837465019',
        'is_active' => true,
    ]);
});

test('sync endpoint triggers without error and returns success', function () {
    $this->actingAs($this->user)
        ->post(route('client.connect.sync'))
        ->assertRedirect();
});

test('webhook token can be updated', function () {
    $response = $this->actingAs($this->user)
        ->post(route('client.connect.webhook-token'), [
            'verify_token' => 'custom-secure-verify-token-12345',
        ]);

    $response->assertRedirect();
});

test('test ping endpoint dispatches successfully', function () {
    $response = $this->actingAs($this->user)
        ->post(route('client.connect.test-ping', ['channel' => 'whatsapp']));

    $response->assertRedirect();
});

test('channel can be disconnected', function () {
    $channel = ChannelIdentity::create([
        'channel_type' => 'instagram',
        'account_name' => 'ravisn.ai',
        'external_id' => '9988776655443',
        'business_account_id' => 'RAVISN Global Corp',
        'access_token' => 'test_token',
        'webhook_verify_token' => 'ravisn-verify-token',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->delete(route('client.connect.disconnect', ['channel' => 'instagram']));

    $response->assertRedirect();

    $channel->refresh();
    expect($channel->is_active)->toBeFalse();
});
