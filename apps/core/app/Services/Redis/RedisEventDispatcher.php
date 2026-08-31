<?php

namespace App\Services\Redis;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class RedisEventDispatcher
{
    /**
     * Push job payload to Redis Queue or Stream for AI worker.
     */
    public function dispatchInboundAiJob(array $payload, string $queueKey = 'inbound_ai_jobs'): void
    {
        try {
            $json = json_encode($payload, JSON_THROW_ON_ERROR);
            Redis::rpush($queueKey, $json);
        } catch (\Throwable $e) {
            Log::error('[RedisEventDispatcher] Failed to push AI job to Redis', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
        }
    }

    /**
     * Publish event to Redis Pub/Sub channel for real-time CRM updates.
     */
    public function publishCrmUpdate(array $data, string $channel = 'crm_channel_updates'): void
    {
        try {
            $json = json_encode($data, JSON_THROW_ON_ERROR);
            Redis::publish($channel, $json);
        } catch (\Throwable $e) {
            Log::error('[RedisEventDispatcher] Failed to publish CRM update', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
