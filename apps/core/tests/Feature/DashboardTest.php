<?php

use App\Models\Tenant;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dual-engine operational dashboard', function () {
    $tenant = Tenant::create([
        'name' => 'Acme Test',
        'email' => 'acme@test.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'role' => 'client',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('overview')
        ->has('usage')
        ->has('telemetry')
        ->has('trends')
        ->has('recentCampaigns')
        ->has('liveQueue')
        ->where('telemetry.total_sent', 0)
        // Nothing sent yet: the rate is unknown, not an invented 100%.
        ->where('telemetry.delivery_rate', null)
    );
});
