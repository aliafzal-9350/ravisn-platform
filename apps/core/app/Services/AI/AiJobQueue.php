<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Redis;

/**
 * The Redis Stream the Python agent worker reads AI jobs from.
 *
 * Each entry is {payload: <job JSON>, attempt: 1}. The worker reads it through
 * a consumer group and only removes it once handled, so a crash never loses a
 * customer's message (see apps/agent/src/workers/redis_consumer.py).
 */
class AiJobQueue
{
    /** Older entries are trimmed (approximately) beyond this length. */
    public const MAX_LENGTH = 10000;

    public function stream(): string
    {
        return (string) config('services.meta.inbound_ai_stream', 'ai:inbound');
    }

    /**
     * @param  array<string, mixed>|string  $job  the job, or its JSON encoding
     * @return string the stream entry id
     */
    public function push(array|string $job): string
    {
        $payload = is_string($job) ? $job : json_encode($job, JSON_THROW_ON_ERROR);

        // Shared with Python, so the unprefixed bridge connection.
        return (string) Redis::connection('bridge')->xadd(
            $this->stream(), '*', ['payload' => $payload, 'attempt' => '1'], self::MAX_LENGTH, true
        );
    }

    /**
     * Jobs currently waiting in the stream, oldest first (for tests and support).
     *
     * @return list<array<string, mixed>>
     */
    public function pending(): array
    {
        $entries = Redis::connection('bridge')->xrange($this->stream(), '-', '+') ?: [];

        return array_values(array_map(fn (array $fields) => json_decode($fields['payload'], true), $entries));
    }

    public function clear(): void
    {
        Redis::connection('bridge')->del($this->stream());
    }
}
