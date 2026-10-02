<?php

namespace App\Services\AI;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * HTTP client for the internal FastAPI agent. Every call carries the shared
 * X-Internal-Token; the agent rejects requests without it.
 */
class AgentClient
{
    public function request(int $timeoutSeconds = 10): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.agent.url'), '/'))
            ->withHeaders(['X-Internal-Token' => (string) config('services.agent.internal_token')])
            ->acceptJson()
            ->timeout($timeoutSeconds);
    }
}
