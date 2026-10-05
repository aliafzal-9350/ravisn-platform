<?php

namespace App\Services\AI;

use App\Exceptions\EmbeddingUnavailableException;

class EmbeddingService
{
    public function __construct(
        protected AgentClient $agent
    ) {}

    /**
     * Generate a 1536-dimensional vector embedding for the given text via
     * the AI agent service.
     *
     * @throws EmbeddingUnavailableException when the agent is unreachable or
     *                                       returns no usable embedding.
     */
    public function embed(string $text): array
    {
        try {
            $response = $this->agent->request()->post('/api/v1/knowledge/embed', [
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
