<?php

use App\Models\ApiKey;
use App\Models\Tenant;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('shows api keys with formatted last used timestamps', function () {
    $tenant = Tenant::create([
        'name' => 'Acme',
        'email' => 'billing@example.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'role' => 'client',
    ]);

    ApiKey::create([
        'tenant_id' => $tenant->id,
        'name' => 'Production',
        'key' => hash('sha256', 'zm_live_test'),
        'last_used_at' => '2026-05-27 07:45:00',
    ]);

    $this->actingAs($user)
        ->get(route('client.developer.index'))
        ->assertSuccessful()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('client/developer/index')
            ->where('apiKeys.0.last_used_at', '2026-05-27 07:45')
        );
});
