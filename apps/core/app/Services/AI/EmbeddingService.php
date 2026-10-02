<?php

namespace App\Services\AI;

use App\Exceptions\EmbeddingUnavailableException;
use Illuminate\Support\Facades\Http;

class EmbeddingService
{
    /**
     * Generate a 1536-dimensional vector embedding for the given text via
     * the AI agent service.
     *
     * @throws EmbeddingUnavailableException when the agent is unreachable or
     *                                       returns no usable embedding.
     */
    public function embed(string $text): array
    {
        $agentUrl = config('services.agent.url', env('AGENT_API_URL', 'http://agent:8000'));

        try {
            $response = Http::timeout(10)->post("{$agentUrl}/api/v1/knowledge/embed", [
                'text' => $text,
            ]);
        } catch (\Throwable $e) {
            throw new EmbeddingUnavailableException(
                'AI embedding service is unreachable: '.$e->getMessage(),
                previous: $e
            );
        }

        $embedding = $response->json('embedding');
        if (! $response->successful() || empty($embedding)) {
            throw new EmbeddingUnavailableException(
                'AI embedding service returned no usable embedding (HTTP '.$response->status().').'
            );
        }

        return $embedding;
    }
}
