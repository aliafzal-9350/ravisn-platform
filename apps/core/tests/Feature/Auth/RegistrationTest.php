<?php

use App\Models\Tenant;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

/**
 * RAVISN is agency-managed: people join a workspace by invitation, so there is
 * no way to create an account (and a workspace with AI budget) by yourself.
 */
test('the public registration page and endpoint do not exist', function () {
    $this->get('/register')->assertNotFound();

    $this->post('/register', [
        'name' => 'Stranger',
        'email' => 'stranger@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    expect(User::where('email', 'stranger@example.com')->exists())->toBeFalse();
    $this->assertGuest();
});

function fakeGoogleLogin(string $email): void
{
    $googleUser = (new GoogleUser)->map(['id' => 'google-123', 'name' => 'Google Person', 'email' => $email]);
    $provider = Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
    $provider->shouldReceive('user')->andReturn($googleUser);
    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
}

test('google sign-in never creates an account for an unknown address', function () {
    fakeGoogleLogin('stranger@gmail.com');

    $this->get('/auth/google/callback')
        ->assertRedirect('/login')
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'stranger@gmail.com')->exists())->toBeFalse()
        ->and(Tenant::count())->toBe(0);
    $this->assertGuest();
});

test('google sign-in logs in an existing account', function () {
    $user = User::factory()->for(Tenant::factory())->create(['email' => 'owner@clinic.com']);
    fakeGoogleLogin('owner@clinic.com');

    $this->get('/auth/google/callback')->assertRedirect('/dashboard');

    $this->assertAuthenticatedAs($user);
});
