<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsClient
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized. Workspace access required.');
        }

        if (! $user->tenant) {
            $workspace = Tenant::firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => "{$user->name} Workspace",
                    'status' => 'active',
                ]
            );

            $user->forceFill([
                'role' => User::ROLE_ADMIN,
                'tenant_id' => $workspace->id,
            ])->save();

            $user->setRelation('tenant', $workspace);
        }

        return $next($request);
    }
}
