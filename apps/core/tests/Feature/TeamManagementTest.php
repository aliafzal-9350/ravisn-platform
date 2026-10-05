<?php

use App\Mail\TeamInvitationMail;
use App\Models\TeamInvitation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    $this->admin = User::factory()->create(['role' => 'admin', 'tenant_id' => $this->tenant->id]);
});

test('an admin can invite an agent by email', function () {
    Mail::fake();

    $this->actingAs($this->admin)
        ->post('/dashboard/team/invitations', ['email' => 'New.Agent@Example.com', 'role' => 'agent'])
        ->assertRedirect();

    $invitation = TeamInvitation::firstOrFail();
    expect($invitation->email)->toBe('new.agent@example.com')
        ->and($invitation->role)->toBe('agent')
        ->and((string) $invitation->tenant_id)->toBe((string) $this->tenant->id)
        ->and($invitation->expires_at->isFuture())->toBeTrue();

    Mail::assertQueued(TeamInvitationMail::class, fn ($mail) => $mail->hasTo('new.agent@example.com'));
});

test('the invitation token is stored hashed and never in plain text', function () {
    Mail::fake();

    $this->actingAs($this->admin)->post('/dashboard/team/invitations', ['email' => 'a@example.com', 'role' => 'agent']);

    Mail::assertQueued(TeamInvitationMail::class, function ($mail) {
        $plain = basename($mail->acceptUrl);

        return TeamInvitation::firstOrFail()->token !== $plain
            && TeamInvitation::findPendingByToken($plain) !== null;
    });
});

test('inviting an email that already has an account is rejected', function () {
    Mail::fake();
    User::factory()->create(['email' => 'taken@example.com']);

    $this->actingAs($this->admin)
        ->post('/dashboard/team/invitations', ['email' => 'taken@example.com', 'role' => 'agent'])
        ->assertSessionHasErrors('email');

    Mail::assertNothingQueued();
});

test('invalid roles and addresses are rejected', function (array $payload, string $field) {
    $this->actingAs($this->admin)->post('/dashboard/team/invitations', $payload)->assertSessionHasErrors($field);
})->with([
    'unknown role' => [['email' => 'a@example.com', 'role' => 'owner'], 'role'],
    'bad email' => [['email' => 'nope', 'role' => 'agent'], 'email'],
]);

test('re-inviting the same email refreshes a single pending invitation', function () {
    Mail::fake();

    $this->actingAs($this->admin)->post('/dashboard/team/invitations', ['email' => 'a@example.com', 'role' => 'agent']);
    $first = TeamInvitation::firstOrFail()->token;
    $this->actingAs($this->admin)->post('/dashboard/team/invitations', ['email' => 'a@example.com', 'role' => 'admin']);

    expect(TeamInvitation::count())->toBe(1)
        ->and(TeamInvitation::first()->token)->not->toBe($first)
        ->and(TeamInvitation::first()->role)->toBe('admin');
});

test('an invitee can accept, set a password and lands signed in as an agent', function () {
    Mail::fake();
    [$invitation, $token] = TeamInvitation::issue($this->tenant, 'agent@example.com', 'agent', $this->admin);

    $this->get("/invitations/{$token}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('auth/accept-invitation')
        ->where('invitation.email', 'agent@example.com')
        ->where('invitation.workspace', $this->tenant->name));

    $this->post("/invitations/{$token}", [
        'name' => 'Sam Agent',
        'password' => 'a-Strong-pass-123',
        'password_confirmation' => 'a-Strong-pass-123',
    ])->assertRedirect(route('dashboard'));

    $user = User::where('email', 'agent@example.com')->firstOrFail();
    expect($user->role)->toBe('agent')
        ->and((string) $user->tenant_id)->toBe((string) $this->tenant->id)
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($invitation->fresh()->accepted_at)->not->toBeNull();

    $this->assertAuthenticatedAs($user);
});

test('an invitation can only be used once', function () {
    [, $token] = TeamInvitation::issue($this->tenant, 'once@example.com', 'agent', $this->admin);
    $payload = ['name' => 'Once', 'password' => 'a-Strong-pass-123', 'password_confirmation' => 'a-Strong-pass-123'];

    $this->post("/invitations/{$token}", $payload)->assertRedirect();
    auth()->logout();

    $this->post("/invitations/{$token}", $payload)->assertSessionHasErrors('token');
    expect(User::where('email', 'once@example.com')->count())->toBe(1);
});

test('expired and unknown tokens cannot be used', function () {
    [$invitation, $token] = TeamInvitation::issue($this->tenant, 'late@example.com', 'agent', $this->admin);
    $invitation->update(['expires_at' => now()->subMinute()]);

    $this->get("/invitations/{$token}")->assertInertia(fn ($page) => $page->where('invitation', null));
    $this->post("/invitations/{$token}", ['name' => 'Late', 'password' => 'a-Strong-pass-123', 'password_confirmation' => 'a-Strong-pass-123'])
        ->assertSessionHasErrors('token');
    $this->post('/invitations/does-not-exist', ['name' => 'X', 'password' => 'a-Strong-pass-123', 'password_confirmation' => 'a-Strong-pass-123'])
        ->assertSessionHasErrors('token');

    expect(User::where('email', 'late@example.com')->exists())->toBeFalse();
});

test('a weak password is rejected and does not burn the invitation', function () {
    [$invitation, $token] = TeamInvitation::issue($this->tenant, 'weak@example.com', 'agent', $this->admin);

    $this->post("/invitations/{$token}", ['name' => 'Weak', 'password' => 'abc', 'password_confirmation' => 'abc'])
        ->assertSessionHasErrors('password');

    expect($invitation->fresh()->accepted_at)->toBeNull();
});

test('an admin can change a teammate\'s role', function () {
    $agent = User::factory()->create(['role' => 'agent', 'tenant_id' => $this->tenant->id]);

    $this->actingAs($this->admin)->patch("/dashboard/team/members/{$agent->id}", ['role' => 'admin'])->assertRedirect();

    expect($agent->fresh()->role)->toBe('admin');
});

test('the last administrator cannot be demoted or removed', function () {
    $this->actingAs($this->admin)->patch("/dashboard/team/members/{$this->admin->id}", ['role' => 'agent'])
        ->assertSessionHasErrors('role');
    $this->actingAs($this->admin)->delete("/dashboard/team/members/{$this->admin->id}")
        ->assertSessionHasErrors('member');

    expect($this->admin->fresh()->role)->toBe('admin');
});

test('a legacy client owner counts as an administrator for the last-admin guard', function () {
    $owner = User::factory()->create(['role' => 'client', 'tenant_id' => Tenant::factory()->create()->id]);

    $this->actingAs($owner)->patch("/dashboard/team/members/{$owner->id}", ['role' => 'agent'])->assertSessionHasErrors('role');
});

test('an admin can demote themselves when another administrator exists', function () {
    User::factory()->create(['role' => 'admin', 'tenant_id' => $this->tenant->id]);

    $this->actingAs($this->admin)->patch("/dashboard/team/members/{$this->admin->id}", ['role' => 'agent'])->assertRedirect();

    expect($this->admin->fresh()->role)->toBe('agent');
});

test('an admin can remove an agent but not themselves', function () {
    $agent = User::factory()->create(['role' => 'agent', 'tenant_id' => $this->tenant->id]);

    $this->actingAs($this->admin)->delete("/dashboard/team/members/{$agent->id}")->assertRedirect();
    expect(User::find($agent->id))->toBeNull();

    $this->actingAs($this->admin)->delete("/dashboard/team/members/{$this->admin->id}")->assertSessionHasErrors('member');
});

test('team management never reaches another workspace', function () {
    $otherTenant = Tenant::factory()->create();
    $stranger = User::factory()->create(['role' => 'agent', 'tenant_id' => $otherTenant->id]);
    $foreignInvite = TeamInvitation::factory()->create(['tenant_id' => $otherTenant->id]);

    $this->actingAs($this->admin)->patch("/dashboard/team/members/{$stranger->id}", ['role' => 'admin'])->assertNotFound();
    $this->actingAs($this->admin)->delete("/dashboard/team/members/{$stranger->id}")->assertNotFound();
    $this->actingAs($this->admin)->delete("/dashboard/team/invitations/{$foreignInvite->id}")->assertNotFound();

    expect($stranger->fresh()->role)->toBe('agent');
});

test('the team page lists only this workspace\'s members and pending invitations', function () {
    User::factory()->create(['role' => 'agent', 'tenant_id' => Tenant::factory()->create()->id, 'name' => 'Outsider']);
    TeamInvitation::factory()->create(['tenant_id' => $this->tenant->id, 'email' => 'pending@example.com']);
    TeamInvitation::factory()->create(['email' => 'foreign@example.com']);

    $this->actingAs($this->admin)->get('/dashboard/team')->assertInertia(fn ($page) => $page
        ->component('client/team/index')
        ->has('members', 1)
        ->has('invitations', 1)
        ->where('invitations.0.email', 'pending@example.com'));
});

test('an admin can revoke and resend an invitation', function () {
    Mail::fake();
    $invitation = TeamInvitation::factory()->create(['tenant_id' => $this->tenant->id]);
    $oldToken = $invitation->token;

    $this->actingAs($this->admin)->post("/dashboard/team/invitations/{$invitation->id}/resend")->assertRedirect();
    expect($invitation->fresh()->token)->not->toBe($oldToken);
    Mail::assertQueued(TeamInvitationMail::class);

    $this->actingAs($this->admin)->delete("/dashboard/team/invitations/{$invitation->id}")->assertRedirect();
    expect(TeamInvitation::find($invitation->id))->toBeNull();
});
