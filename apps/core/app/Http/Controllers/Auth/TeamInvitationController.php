<?php

namespace App\Http\Controllers\Auth;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeamInvitationController extends Controller
{
    use PasswordValidationRules;

    public function show(string $token): Response
    {
        $invitation = TeamInvitation::findPendingByToken($token);

        return Inertia::render('auth/accept-invitation', [
            'invitation' => $invitation ? [
                'email' => $invitation->email,
                'workspace' => $invitation->tenant->name,
                'role' => $invitation->role,
            ] : null,
            'token' => $token,
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invitation = TeamInvitation::findPendingByToken($token);

        if (! $invitation) {
            throw ValidationException::withMessages(['token' => 'This invitation is no longer valid.']);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => $this->passwordRules(),
        ]);

        if (User::whereRaw('lower(email) = ?', [$invitation->email])->exists()) {
            throw ValidationException::withMessages(['token' => 'This email already has an account. Sign in instead.']);
        }

        $user = DB::transaction(function () use ($invitation, $validated) {
            $user = new User([
                'name' => $validated['name'],
                'email' => $invitation->email,
                'password' => $validated['password'],
                'role' => $invitation->role,
                'tenant_id' => $invitation->tenant_id,
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();

            $invitation->forceFill(['accepted_at' => now()])->save();

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }
}
