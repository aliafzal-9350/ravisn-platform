<?php

putenv('DB_CONNECTION=pgsql');
putenv('DB_HOST=postgres');
putenv('DB_PORT=5432');
putenv('DB_DATABASE=ravisn_db');
putenv('DB_USERNAME=ravisn_user');
putenv('DB_PASSWORD=ravisn_secret_password');
putenv('DB_SSLMODE=disable');
putenv('DATABASE_URL=');
$_ENV['DB_DATABASE'] = 'ravisn_db';
$_ENV['DB_USERNAME'] = 'ravisn_user';
$_ENV['DB_PASSWORD'] = 'ravisn_secret_password';
$_ENV['DB_SSLMODE'] = 'disable';
$_ENV['DATABASE_URL'] = '';
$_SERVER['DB_DATABASE'] = 'ravisn_db';
$_SERVER['DB_USERNAME'] = 'ravisn_user';
$_SERVER['DB_PASSWORD'] = 'ravisn_secret_password';
$_SERVER['DB_SSLMODE'] = 'disable';
$_SERVER['DATABASE_URL'] = '';

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfTokens::class,
        ]);
    })
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}
