<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Http;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard and receive apiUsage prop', function () {
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
        ->component('client/dashboard')
        ->has('apiUsage')
        ->where('apiUsage.categories.marketing.count', 0)
        ->where('apiUsage.categories.marketing.cost', '0.00')
        ->where('apiUsage.total_sent', 0)
        ->where('apiUsage.total_cost', '0.00')
    );
});

test('dashboard fetches apiUsage analytics and calculates pricing correctly', function () {
    config([
        'services.meta.waba_id' => 'test_waba_123',
        'services.meta.access_token' => 'test_token_456',
    ]);

    Http::fake([
        'graph.facebook.com/*' => Http::response([
            'conversation_analytics' => [
                'data' => [
                    [
                        'data_points' => [
                            ['conversation_category' => 'MARKETING', 'conversation_count' => 100],
                            ['conversation_category' => 'AUTHENTICATION', 'conversation_count' => 50],
                            ['conversation_category' => 'UTILITY', 'conversation_count' => 25],
                            ['conversation_category' => 'SERVICE', 'conversation_count' => 10],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $tenant = Tenant::create([
        'name' => 'Acme Test',
        'email' => 'acme@test.com',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'role' => 'client',
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));
    $response->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('client/dashboard')
        ->has('apiUsage')
        ->where('apiUsage.categories.marketing.count', 100)
        ->where('apiUsage.categories.marketing.cost', '2.50')
        ->where('apiUsage.categories.authentication.count', 50)
        ->where('apiUsage.categories.authentication.cost', '0.20')
        ->where('apiUsage.categories.utility.count', 25)
        ->where('apiUsage.categories.utility.cost', '0.10')
        ->where('apiUsage.categories.service.count', 10)
        ->where('apiUsage.categories.service.cost', '0.00')
        ->where('apiUsage.total_sent', 185)
        ->where('apiUsage.total_cost', '2.80')
    );
});
