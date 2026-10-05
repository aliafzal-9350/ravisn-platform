<?php

use App\Models\Tenant;
use App\Models\User;

test('community dashboard pages render for a workspace user', function (string $path) {
    $workspace = Tenant::create([
        'name' => 'Smoke Test Workspace',
        'email' => 'smoke@example.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'role' => 'client',
        'tenant_id' => $workspace->id,
    ]);

    $this->actingAs($user)
        ->get($path)
        ->assertOk();
})->with([
    'dashboard' => '/dashboard',
    'whatsapp accounts' => '/dashboard/whatsapp-accounts',
    'inbox' => '/dashboard/inbox',
    'templates' => '/dashboard/templates',
    'campaigns' => '/dashboard/campaigns',
    'contacts' => '/dashboard/contacts',
    'automations' => '/dashboard/automations',
    'developer' => '/dashboard/developer',
]);

test('an account without a workspace is told to ask for an invitation, not given a workspace', function () {
    $user = User::factory()->create([
        'role' => 'legacy',
        'tenant_id' => null,
    ]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertForbidden();

    expect($user->fresh()->tenant_id)->toBeNull()
        ->and(\App\Models\Tenant::count())->toBe(0);
});
