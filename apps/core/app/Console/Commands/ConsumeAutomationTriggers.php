<?php

namespace App\Console\Commands;

use App\Models\AutomationFlow;
use App\Services\Automation\WorkflowEngine;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class ConsumeAutomationTriggers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'automation:consume-triggers';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Consume the automation_triggers Redis stream and start a WorkflowEngine run for each matched flow trigger.';

    protected const STREAM = 'automation_triggers';

    protected const GROUP = 'workflow-engine';

    public function handle(WorkflowEngine $engine): void
    {
        $consumer = 'worker-'.getmypid();

        try {
            Redis::xgroup('CREATE', self::STREAM, self::GROUP, '0', true);
        } catch (\Throwable $e) {
            // Consumer group already exists — expected on every restart after the first.
        }

        $this->info('⚡ [WorkflowEngine] Listening on Redis stream ['.self::STREAM.'] as consumer ['.$consumer.']');

        while (true) {
            $entries = Redis::xreadgroup(self::GROUP, $consumer, [self::STREAM => '>'], 10, 5000);

            if (empty($entries)) {
                continue;
            }

            foreach ($entries as $messages) {
                foreach ($messages as $id => $fields) {
                    $this->processEntry($engine, $fields);
                    Redis::xack(self::STREAM, self::GROUP, [$id]);
                }
            }
        }
    }

    /**
     * @param  array<string, string>  $fields
     */
    protected function processEntry(WorkflowEngine $engine, array $fields): void
    {
        try {
            $flow = AutomationFlow::find($fields['flow_id'] ?? null);

            if (! $flow) {
                Log::warning('[ConsumeAutomationTriggers] Trigger references a missing/deleted flow', $fields);

                return;
            }

            $run = $engine->startRun($flow, [
                'customer_phone' => $fields['customer_phone'] ?? '',
                'message_text' => $fields['message_text'] ?? '',
                'whatsapp_account_id' => $fields['whatsapp_account_id'] ?? null,
                'triggered_at' => $fields['triggered_at'] ?? now()->toISOString(),
            ]);

            Log::info("[ConsumeAutomationTriggers] Started WorkflowRun {$run->id} for flow {$flow->id}");
        } catch (\Throwable $e) {
            Log::error('[ConsumeAutomationTriggers] Failed to start workflow run: '.$e->getMessage(), $fields);
        }
    }
}
