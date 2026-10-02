<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function workspaceUser(string $role, ?Tenant $tenant = null): User
{
    $tenant ??= Tenant::factory()->create();

    return User::factory()->create(['role' => $role, 'tenant_id' => $tenant->id]);
}

test('admin-only pages are forbidden for agents', function (string $path) {
    $this->actingAs(workspaceUser('agent'))->get($path)->assertForbidden();
})->with([
    'connect' => '/dashboard/connect',
    'bookings' => '/dashboard/bookings',
    'knowledge base' => '/dashboard/knowledge',
    'prompt tuning' => '/dashboard/prompt-tuning',
    'simulator' => '/dashboard/simulator',
    'workspace settings' => '/dashboard/settings',
    'whatsapp accounts' => '/dashboard/whatsapp-accounts',
    'contact groups' => '/dashboard/contact-groups',
    'developer' => '/dashboard/developer',
    'automations' => '/dashboard/automations',
    'templates' => '/dashboard/templates',
    'campaigns' => '/dashboard/campaigns',
    'team' => '/dashboard/team',
    'contact export' => '/dashboard/contacts/export',
]);

test('admin-only actions are forbidden for agents', function (string $method, string $path) {
    $this->actingAs(workspaceUser('agent'))->{$method}($path)->assertForbidden();
})->with([
    ['post', '/dashboard/prompt-tuning'],
    ['post', '/dashboard/developer/keys'],
    ['post', '/dashboard/connect/sync'],
    ['post', '/dashboard/campaigns'],
    ['post', '/dashboard/contacts/import'],
    ['delete', '/dashboard/contacts/1'],
    ['post', '/dashboard/team/invitations'],
    ['post', '/api/v1/channels/sync'],
]);

test('agents keep the inbox, contacts and their own settings', function (string $path) {
    $this->actingAs(workspaceUser('agent'))->get($path)->assertOk();
})->with([
    'inbox' => '/dashboard/inbox',
    'contacts' => '/dashboard/contacts',
    'profile' => '/settings/profile',
    'inbox api' => '/api/v1/threads',
]);

test('an agent landing on the dashboard is sent to the inbox', function () {
    $this->actingAs(workspaceUser('agent'))->get('/dashboard')->assertRedirect(route('client.inbox.index'));
});

test('admins and legacy client owners keep full access', function (string $role, string $path) {
    $this->actingAs(workspaceUser($role))->get($path)->assertOk();
})->with(['admin' => ['admin'], 'legacy client' => ['client']])->with([
    '/dashboard/templates',
    '/dashboard/developer',
    '/dashboard/team',
    '/dashboard/inbox',
]);

test('forbidden responses render an error page, not a redirect loop', function () {
    $this->actingAs(workspaceUser('agent'))
        ->get('/dashboard/prompt-tuning')
        ->assertForbidden()
        ->assertInertia(fn ($page) => $page->component('errors/forbidden'));
});

test('the middleware never rewrites an agent\'s role', function () {
    $agent = workspaceUser('agent');

    $this->actingAs($agent)->get('/dashboard/inbox')->assertOk();

    expect($agent->fresh()->role)->toBe('agent');
});

test('shared props expose the normalised workspace role', function (string $stored, string $expected) {
    $this->actingAs(workspaceUser($stored))
        ->get('/dashboard/inbox')
        ->assertInertia(fn ($page) => $page->where('auth.role', $expected));
})->with([
    'agent' => ['agent', 'agent'],
    'admin' => ['admin', 'admin'],
    'legacy client' => ['client', 'admin'],
]);
