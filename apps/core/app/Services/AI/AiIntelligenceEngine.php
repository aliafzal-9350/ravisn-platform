<?php

namespace App\Services\AI;

use App\Models\SystemNotification;
use App\Models\Thread;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class AiIntelligenceEngine
{
    /**
     * Parsed keyword patterns, keyed by 'human_request_patterns'/'frustration_patterns',
     * loaded once per request from the shared cross-app keyword source.
     *
     * @var array<string, array<int, string>>|null
     */
    protected static ?array $keywordPatterns = null;

    /**
     * Load and cache the compiled regex patterns from the shared keyword file.
     *
     * The canonical source is /shared/escalation-keywords.json at the repo root;
     * this reads the build-time copy synced into this app via
     * scripts/sync-escalation-keywords.sh, since apps/core and apps/agent are
     * deployed as separate containers with no shared filesystem at runtime.
     *
     * @return array<string, array<int, string>>
     */
    protected static function keywordPatterns(): array
    {
        if (self::$keywordPatterns !== null) {
            return self::$keywordPatterns;
        }

        $path = resource_path('data/escalation-keywords.json');
        $decoded = json_decode(file_get_contents($path), true) ?: [];

        $compile = fn (array $fragments): array => array_map(
            fn (string $fragment): string => '/\b('.$fragment.')\b/i',
            $fragments
        );

        return self::$keywordPatterns = [
            'human_request_patterns' => $compile($decoded['human_request_patterns'] ?? []),
            'frustration_patterns' => $compile($decoded['frustration_patterns'] ?? []),
        ];
    }

    /**
     * Evaluate customer message sentiment and intent for human escalation.
     *
     * @return array{is_escalated: bool, sentiment: string, confidence: float, reason: string}
     */
    public function evaluate(string $messageText, Thread $thread): array
    {
        $cleanText = trim($messageText);
        if (empty($cleanText)) {
            return [
                'is_escalated' => false,
                'sentiment' => 'neutral',
                'confidence' => 0.0,
                'reason' => '',
            ];
        }

        $patterns = self::keywordPatterns();

        // 1. Check for explicit human agent requests
        foreach ($patterns['human_request_patterns'] as $pattern) {
            if (preg_match($pattern, $cleanText, $matches)) {
                return [
                    'is_escalated' => true,
                    'sentiment' => 'escalation_requested',
                    'confidence' => 0.99,
                    'reason' => "Customer explicitly requested a human agent ('{$matches[0]}').",
                ];
            }
        }

        // 2. Check for high frustration or anger sentiment
        foreach ($patterns['frustration_patterns'] as $pattern) {
            if (preg_match($pattern, $cleanText, $matches)) {
                return [
                    'is_escalated' => true,
                    'sentiment' => 'frustrated',
                    'confidence' => 0.95,
                    'reason' => "Customer sentiment indicates severe frustration/anger ('{$matches[0]}').",
                ];
            }
        }

        return [
            'is_escalated' => false,
            'sentiment' => 'neutral',
            'confidence' => 0.1,
            'reason' => '',
        ];
    }

    /**
     * Trigger human escalation: pause bot_active, mark thread as human_takeover,
     * notify agents over websockets, and record system alert.
     */
    public function triggerHumanEscalation(Thread $thread, string $reason, ?string $customerPhone = null): void
    {
        Log::warning("[AiIntelligenceEngine] Escalating Thread {$thread->id} to human staff. Reason: {$reason}");

        // 1. Update Thread to pause autonomous AI auto-replies
        $thread->update([
            'bot_active' => false,
            'status' => 'human_takeover',
        ]);

        $contact = $thread->contact;
        $customerName = $contact?->name ?? $contact?->full_name ?? ($customerPhone ?: 'Customer');
        $tenantId = $thread->tenantId();

        // 2. Record staff System Notification if tenant is known
        if ($tenantId) {
            try {
                SystemNotification::create([
                    'tenant_id' => $tenantId,
                    'title' => '⚠️ Human Escalation Triggered',
                    'message' => "Thread with {$customerName} requires human intervention. {$reason}",
                    'type' => 'warning',
                ]);
            } catch (\Throwable $e) {
                Log::warning('[AiIntelligenceEngine] SystemNotification creation skipped: '.$e->getMessage());
            }
        }

        // 3. Broadcast real-time websocket & Redis notification to CRM Inbox
        $broadcastPayload = json_encode([
            'event' => 'HumanTakeoverRequested',
            'thread_id' => (string) $thread->id,
            'contact_id' => (string) $thread->contact_id,
            'channel' => $thread->channel_type ?? 'whatsapp',
            'customer_name' => $customerName,
            'reason' => $reason,
            'bot_active' => false,
            'status' => 'human_takeover',
            'timestamp' => now()->toISOString(),
        ]);

        try {
            Redis::publish(
                config('services.meta.crm_broadcast_channel', env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates')),
                $broadcastPayload
            );
        } catch (\Throwable $e) {
            Log::warning('[AiIntelligenceEngine] Redis broadcast skipped: '.$e->getMessage());
        }
    }
}
