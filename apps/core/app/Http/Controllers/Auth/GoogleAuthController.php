<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect user to Google OAuth provider.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle callback from Google OAuth.
     */
    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            // Google sign-in is for existing accounts only: accounts are created
            // by invitation, never by whoever happens to have a Google login.
            $user = User::where('email', $googleUser->getEmail())->first();

            if (! $user) {
                return redirect('/login')->withErrors([
                    'email' => 'There is no RAVISN account for this Google address. Ask your workspace administrator for an invitation.',
                ]);
            }

            // Google has verified this address.
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            Auth::login($user, true);

            return redirect()->intended('/dashboard');
        } catch (\Throwable $e) {
            Log::error('[GoogleAuthController] OAuth error: ' . $e->getMessage());
            return redirect('/login')->with('error', 'Google login failed. Please try again.');
        }
    }
}
