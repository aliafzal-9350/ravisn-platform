<?php

namespace App\Console\Commands;

use App\Events\MessageCreatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Events\ThreadUpdatedEvent;
use App\Models\Thread;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

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

                // Publishers (notably the Python agent) do not know the tenant, so
                // it is derived from the thread. Without it the tenant channel
                // never receives the event.
                $tenantId = isset($payload['tenant_id'])
                    ? (string) $payload['tenant_id']
                    : $this->tenantIdForThread($threadId);

                if ($event === 'MessageCreated') {
                    $msgData = $payload['message'] ?? $payload;
                    if (is_array($msgData) && $tenantId) {
                        $msgData['tenant_id'] = $tenantId;
                    }
                    MessageCreatedEvent::dispatch($msgData, $threadId);
                    Log::info("[ListenCrmUpdates] Broadcasted MessageCreatedEvent to Reverb for Thread: {$threadId}");
                } elseif ($event === 'ThreadUpdated') {
                    $threadData = $payload['thread'] ?? $payload;
                    if (is_array($threadData) && $tenantId) {
                        $threadData['tenant_id'] = $tenantId;
                    }
                    ThreadUpdatedEvent::dispatch($threadData, $threadId);
                    Log::info("[ListenCrmUpdates] Broadcasted ThreadUpdatedEvent to Reverb for Thread: {$threadId}");
                } elseif ($event === 'MessageStatusUpdated') {
                    $msgId = (string) ($payload['message_id'] ?? '');
                    $status = (string) ($payload['status'] ?? 'delivered');
                    if ($msgId && $threadId) {
                        MessageStatusUpdatedEvent::dispatch($msgId, (string) $threadId, $status, $tenantId);
                        Log::info("[ListenCrmUpdates] Broadcasted MessageStatusUpdatedEvent to Reverb for Msg: {$msgId} Status: {$status}");
                    }
                } elseif ($event === 'HumanTakeoverRequested' && $threadId) {
                    // Both AiIntelligenceEngine (PHP pre-filter) and the Python agent's
                    // human_handoff_node publish this to Redis pub/sub (the Python
                    // process cannot dispatch a Laravel event directly). Translate it
                    // into a ThreadUpdatedEvent broadcast so the escalation badge/banner
                    // the frontend already listens for (.ThreadUpdated) actually updates live.
                    ThreadUpdatedEvent::dispatch([
                        'id' => (string) $threadId,
                        'contact_id' => $payload['contact_id'] ?? null,
                        'channel_type' => $payload['channel'] ?? null,
                        'status' => $payload['status'] ?? 'human_takeover',
                        'bot_active' => (bool) ($payload['bot_active'] ?? false),
                        'last_message_at' => now()->toISOString(),
                        'tenant_id' => $tenantId,
                    ], (string) $threadId);
                    Log::info("[ListenCrmUpdates] Broadcasted ThreadUpdatedEvent (human takeover) to Reverb for Thread: {$threadId}");
                }
            } catch (\Throwable $e) {
                Log::error('[ListenCrmUpdates] Error processing Redis broadcast message: '.$e->getMessage());
            }
        });
    }

    protected function tenantIdForThread(?string $threadId): ?string
    {
        if (! $threadId || ! Str::isUuid($threadId)) {
            return null;
        }

        return Thread::with(['channelIdentity', 'contact'])->find($threadId)?->tenantId();
    }
}
