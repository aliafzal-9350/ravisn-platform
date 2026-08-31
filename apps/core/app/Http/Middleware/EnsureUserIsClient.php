<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
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
                'role' => 'client',
                'tenant_id' => $workspace->id,
            ])->save();

            $user->setRelation('tenant', $workspace);
        } elseif (! $user->isClient()) {
            $user->forceFill(['role' => 'client'])->save();
        }

        return $next($request);
    }
}
