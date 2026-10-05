<?php

namespace App\Services\Meta;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Splits a Meta webhook delivery into its individual events and claims each
 * one atomically in Redis, so Meta retries (which resend the same delivery
 * when we are slow to acknowledge) never trigger a second AI inference or a
 * second reply.
 *
 * Meta batches: one delivery can carry several messages and status updates.
 * Downstream jobs read a single event, so each event is dispatched on its own.
 */
class WebhookEventDeduplicator
{
    protected const TTL_SECONDS = 86400;

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array{payload: array<string, mixed>, redis_key: string|null}>
     *                                                                                  Only events that have not been seen before.
     */
    public function newEvents(array $payload): array
    {
        $events = [];

        foreach ($this->split($payload) as $unit) {
            if ($unit['key'] === null || $this->claim($unit['key'])) {
                $events[] = [
                    'payload' => $unit['payload'],
                    'redis_key' => $unit['key'],
                ];
            } else {
                Log::info('[WebhookEventDeduplicator] Duplicate webhook event dropped', ['key' => $unit['key']]);
            }
        }

        return $events;
    }

    /**
     * Release a claim so a Meta retry can be processed again (used when the
     * job that owned the event failed).
     */
    public function release(?string $redisKey): void
    {
        if (! $redisKey) {
            return;
        }

        try {
            Redis::del($redisKey);
        } catch (\Throwable $e) {
            Log::warning('[WebhookEventDeduplicator] Could not release dedup key: '.$e->getMessage());
        }
    }

    /**
     * Break a delivery into one unit per message / status / messaging event.
     * A delivery with a single event is returned untouched.
     *
     * @param  array<string, mixed>  $payload
     * @return array<int, array{payload: array<string, mixed>, key: string|null}>
     */
    public function split(array $payload): array
    {
        $units = [];

        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                $shared = array_diff_key($value, ['messages' => 1, 'statuses' => 1]);

                foreach ($value['messages'] ?? [] as $message) {
                    $units[] = [
                        'key' => isset($message['id']) ? 'meta_msg_'.$message['id'] : null,
                        'payload' => $this->wrapChange($payload, $entry, $change, $shared + ['messages' => [$message]]),
                    ];
                }

                foreach ($value['statuses'] ?? [] as $status) {
                    $units[] = [
                        'key' => isset($status['id'], $status['status']) ? 'meta_status_'.$status['id'].'_'.$status['status'] : null,
                        'payload' => $this->wrapChange($payload, $entry, $change, $shared + ['statuses' => [$status]]),
                    ];
                }
            }

            foreach ($entry['messaging'] ?? [] as $event) {
                $units[] = [
                    'key' => isset($event['message']['mid']) ? 'meta_msg_'.$event['message']['mid'] : null,
                    'payload' => array_diff_key($payload, ['entry' => 1]) + [
                        'entry' => [array_diff_key($entry, ['messaging' => 1]) + ['messaging' => [$event]]],
                    ],
                ];
            }
        }

        if (count($units) <= 1) {
            return [[
                'key' => $units[0]['key'] ?? $this->legacyKey($payload),
                'payload' => $payload,
            ]];
        }

        return $units;
    }

    /**
     * Atomic "set if absent with expiry". Fails open if Redis is unavailable,
     * because dropping a genuine customer message is worse than a duplicate.
     */
    protected function claim(string $key): bool
    {
        try {
            return (bool) Redis::set($key, 1, 'EX', self::TTL_SECONDS, 'NX');
        } catch (\Throwable $e) {
            Log::warning('[WebhookEventDeduplicator] Redis dedup check failed, processing anyway: '.$e->getMessage());

            return true;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $entry
     * @param  array<string, mixed>  $change
     * @param  array<string, mixed>  $value
     * @return array<string, mixed>
     */
    protected function wrapChange(array $payload, array $entry, array $change, array $value): array
    {
        return array_diff_key($payload, ['entry' => 1]) + [
            'entry' => [
                array_diff_key($entry, ['changes' => 1]) + [
                    'changes' => [array_diff_key($change, ['value' => 1]) + ['value' => $value]],
                ],
            ],
        ];
    }

    /**
     * Older/simplified payload shape with the message at the top level.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function legacyKey(array $payload): ?string
    {
        $id = $payload['messages'][0]['id'] ?? null;

        return $id ? 'meta_msg_'.$id : null;
    }
}
