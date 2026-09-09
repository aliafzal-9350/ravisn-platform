<?php

namespace App\Console\Commands;

use App\Events\MessageCreatedEvent;
use App\Events\ThreadUpdatedEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class ListenCrmUpdates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crm:listen-updates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Listen to Redis Pub/Sub crm_channel_updates and broadcast events to Laravel Reverb / WebSockets';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $channel = config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates'));
        $this->info("⚡ [Laravel Reverb Bridge] Subscribed to Redis channel: [{$channel}]");

        Redis::subscribe([$channel], function (string $message) {
            try {
                $payload = json_decode($message, true);
                if (! is_array($payload)) {
                    return;
                }

                $event = $payload['event'] ?? 'MessageCreated';
                $threadId = $payload['thread_id'] ?? null;

                if ($event === 'MessageCreated') {
                    $msgData = $payload['message'] ?? $payload;
                    MessageCreatedEvent::dispatch($msgData, $threadId);
                    Log::info("[ListenCrmUpdates] Broadcasted MessageCreatedEvent to Reverb for Thread: {$threadId}");
                } elseif ($event === 'ThreadUpdated') {
                    $threadData = $payload['thread'] ?? $payload;
                    ThreadUpdatedEvent::dispatch($threadData, $threadId);
                    Log::info("[ListenCrmUpdates] Broadcasted ThreadUpdatedEvent to Reverb for Thread: {$threadId}");
                }
            } catch (\Throwable $e) {
                Log::error('[ListenCrmUpdates] Error processing Redis broadcast message: ' . $e->getMessage());
            }
        });
    }
}
