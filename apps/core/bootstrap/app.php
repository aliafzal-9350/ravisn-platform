<?php

use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsClient;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Trust X-Forwarded-* from the nginx gateway (private docker network
        // addresses only), so URLs and secure cookies are https behind TLS.
        $middleware->trustProxies(at: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.1']);

        $middleware->redirectUsersTo(fn () => route('dashboard'));

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'webhook/*',
        ]);

        $middleware->alias([
            'client' => EnsureUserIsClient::class,
            'role' => EnsureUserHasRole::class,
            'auth.api' => AuthenticateApiKey::class,
        ]);

        // Reject a forbidden role before route-model binding, so agents can't probe which records exist.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureUserHasRole::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Browser visits that hit a role restriction get a proper page instead of a bare error.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($response->getStatusCode() !== 403 || ($request->expectsJson() && ! $request->header('X-Inertia'))) {
                return $response;
            }

            if ($request->is('api/*', 'webhook/*', 'broadcasting/*') || ! $request->user()) {
                return $response;
            }

            return Inertia::render('errors/forbidden', ['message' => $e->getMessage() ?: null])
                ->toResponse($request)
                ->setStatusCode(403);
        });
    })->create();
