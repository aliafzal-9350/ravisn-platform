<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $rawKey = $request->bearerToken() ?? $request->input('api_key');

        if (! $rawKey) {
            return response()->json(['error' => 'Unauthenticated. API Key required.'], 401);
        }

        $hashedKey = hash('sha256', $rawKey);
        $apiKeyRecord = ApiKey::where('key', $hashedKey)->first();

        if (! $apiKeyRecord) {
            return response()->json(['error' => 'Unauthenticated. Invalid API Key.'], 401);
        }

        // Update last used timestamp
        $apiKeyRecord->update(['last_used_at' => now()]);

        // Mock user resolver so $request->user() returns the tenant user
        $tenant = $apiKeyRecord->tenant;

        if ($tenant->status !== 'active') {
            return response()->json(['error' => 'Unauthorized. Workspace account is not active.'], 403);
        }

        $user = $tenant->users()->first();
        if ($user) {
            $request->setUserResolver(fn () => $user);
        }

        // Store tenant object in request attributes for direct access if needed
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }
}
