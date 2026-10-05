<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Restrict a route to users holding one of the given workspace roles
     * (for example `role:admin`). Everyone else receives a 403.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user && in_array($user->workspaceRole(), $roles, true), 403, 'You do not have permission to access this area.');

        return $next($request);
    }
}
