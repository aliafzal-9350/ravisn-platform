<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Mail\TeamInvitationMail;
use App\Models\TeamInvitation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * The admin's own workspace; team management never crosses tenants.
     */
    protected function tenant(Request $request): Tenant
    {
        $tenant = $request->user()->tenant;

        abort_if($tenant === null, 403, 'Your account is not attached to a workspace.');

        return $tenant;
    }

    /**
     * @return array<int, string>
     */
    protected function roles(): array
    {
        return [User::ROLE_ADMIN, User::ROLE_AGENT];
    }

    public function index(Request $request): Response
    {
        $tenant = $this->tenant($request);

        $members = User::query()
            ->where('tenant_id', $tenant->id)
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->workspaceRole(),
                'is_you' => $user->is($request->user()),
                'joined_at' => $user->created_at?->toIso8601String(),
            ]);

        $invitations = TeamInvitation::query()
            ->where('tenant_id', $tenant->id)
            ->whereNull('accepted_at')
            ->with('inviter:id,name')
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'invited_by' => $invitation->inviter?->name,
                'expires_at' => $invitation->expires_at->toIso8601String(),
                'expired' => $invitation->expires_at->isPast(),
            ]);

        return Inertia::render('client/team/index', [
            'members' => $members,
            'invitations' => $invitations,
        ]);
    }

    public function invite(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);

        $validated = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'role' => ['required', Rule::in($this->roles())],
        ]);

        $email = strtolower($validated['email']);

        if (User::whereRaw('lower(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages(['email' => 'This email already has an account.']);
        }

        [$invitation, $plainToken] = TeamInvitation::issue($tenant, $email, $validated['role'], $request->user());
        $this->sendInvitation($invitation, $plainToken);

        return $this->done("Invitation sent to {$email}.");
    }

    public function resend(Request $request, int $invitation): RedirectResponse
    {
        $invitation = $this->invitation($request, $invitation);

        [$invitation, $plainToken] = TeamInvitation::issue($invitation->tenant, $invitation->email, $invitation->role, $request->user());
        $this->sendInvitation($invitation, $plainToken);

        return $this->done("Invitation re-sent to {$invitation->email}.");
    }

    public function revoke(Request $request, int $invitation): RedirectResponse
    {
        $this->invitation($request, $invitation)->delete();

        return $this->done('Invitation revoked.');
    }

    public function updateRole(Request $request, int $member): RedirectResponse
    {
        $user = $this->member($request, $member);

        $validated = $request->validate(['role' => ['required', Rule::in($this->roles())]]);

        if ($validated['role'] === User::ROLE_AGENT && $user->isAdmin() && $this->adminCount($user->tenant_id) <= 1) {
            throw ValidationException::withMessages(['role' => 'A workspace needs at least one administrator.']);
        }

        $user->forceFill(['role' => $validated['role']])->save();

        return $this->done("{$user->name} is now ".($validated['role'] === User::ROLE_ADMIN ? 'an administrator' : 'an agent').'.');
    }

    public function destroy(Request $request, int $member): RedirectResponse
    {
        $user = $this->member($request, $member);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['member' => 'You cannot remove yourself from the workspace.']);
        }

        if ($user->isAdmin() && $this->adminCount($user->tenant_id) <= 1) {
            throw ValidationException::withMessages(['member' => 'A workspace needs at least one administrator.']);
        }

        $user->delete();

        return $this->done("{$user->name} was removed from the workspace.");
    }

    protected function done(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    protected function member(Request $request, int $id): User
    {
        return User::where('tenant_id', $this->tenant($request)->id)->findOrFail($id);
    }

    protected function invitation(Request $request, int $id): TeamInvitation
    {
        return TeamInvitation::where('tenant_id', $this->tenant($request)->id)->whereNull('accepted_at')->findOrFail($id);
    }

    protected function adminCount(int|string $tenantId): int
    {
        return User::where('tenant_id', $tenantId)->whereIn('role', [User::ROLE_ADMIN, 'client'])->count();
    }

    protected function sendInvitation(TeamInvitation $invitation, string $plainToken): void
    {
        Mail::to($invitation->email)->send(new TeamInvitationMail(
            $invitation,
            route('team.invitations.show', ['token' => $plainToken]),
        ));
    }
}
