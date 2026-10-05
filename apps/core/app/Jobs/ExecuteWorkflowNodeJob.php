<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Models\WhatsappAccount;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunStep;
use App\Services\Automation\ActionExecutor;
use App\Services\Automation\ConditionEvaluator;
use App\Services\Automation\WorkflowEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Executes exactly one node of a workflow run, then dispatches the next
 * node's job (optionally delayed, for a `delay` action) — this is what
 * replaces the old synchronous, whole-flow-in-one-request execution and
 * fixes the `delay` action blocking the webhook request with a real sleep().
 */
class ExecuteWorkflowNodeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 60;

    /**
     * Sanity cap on how many hops a single run may take, to stop a
     * malformed cyclic graph from generating an unbounded job chain.
     */
    protected const MAX_HOPS = 50;

    public function __construct(
        public string $workflowRunId,
        public string $nodeId,
        public int $hop = 0
    ) {}

    public function handle(WorkflowEngine $engine, ActionExecutor $executor): void
    {
        $run = WorkflowRun::findOrFail($this->workflowRunId);

        if (in_array($run->status, ['completed', 'failed'], true)) {
            return;
        }

        if ($this->hop > self::MAX_HOPS) {
            $this->failRun($run, 'Workflow exceeded the maximum step count — check the flow for a cycle.');

            return;
        }

        $flow = $run->automationFlow;
        $step = WorkflowRunStep::firstOrCreate(
            ['workflow_run_id' => $run->id, 'node_id' => $this->nodeId],
            ['status' => 'pending']
        );
        $step->update(['status' => 'running', 'started_at' => now()]);

        try {
            [$action, $nextNodeIds] = $engine->resolveNode($flow, $this->nodeId);

            if ($action === null) {
                $step->update(['status' => 'completed', 'action_type' => 'noop', 'completed_at' => now()]);
                $this->dispatchNext($nextNodeIds);

                return;
            }

            $actionType = $action['type'] ?? '';
            $step->update(['action_type' => $actionType]);
            $messageText = $run->trigger_context['message_text'] ?? '';

            if ($actionType === 'condition') {
                $outcome = ConditionEvaluator::outcome($action, $messageText);

                if (! $outcome['matched']) {
                    $step->update(['status' => 'completed', 'output' => ['matched' => false], 'completed_at' => now()]);
                    $this->completeRun($run);

                    return;
                }

                $branchIndex = $outcome['branch_index'];
                $branchTargets = ($branchIndex !== null && isset($nextNodeIds[$branchIndex]))
                    ? [$nextNodeIds[$branchIndex]]
                    : [];

                $step->update(['status' => 'completed', 'output' => ['matched' => true, 'branch_index' => $branchIndex], 'completed_at' => now()]);
                $this->dispatchNext($branchTargets);

                return;
            }

            if ($actionType === 'delay') {
                $delaySeconds = min((int) ($action['delay_seconds'] ?? 5), 86400);
                $step->update(['status' => 'completed', 'output' => ['delayed_seconds' => $delaySeconds], 'completed_at' => now()]);
                $this->dispatchNext($nextNodeIds, $delaySeconds);

                return;
            }

            $tenant = Tenant::findOrFail($run->tenant_id);
            $account = WhatsappAccount::findOrFail($run->trigger_context['whatsapp_account_id']);
            $contact = $tenant->contacts()->where('phone', $run->customer_phone)->first();
            $customerName = $contact->name ?? $run->customer_phone;

            $replaceVariables = function (?string $text) use ($customerName, $run, $messageText) {
                return str_replace(
                    ['{{{senderName}}}', '{{{senderMobile}}}', '{{{senderMessage}}}'],
                    [$customerName, $run->customer_phone, $messageText],
                    $text ?? ''
                );
            };

            $output = $executor->execute($action, $tenant, $run->customer_phone, $messageText, $account, $replaceVariables);

            $step->update(['status' => 'completed', 'output' => $output, 'completed_at' => now()]);
            $this->dispatchNext($nextNodeIds);
        } catch (\Throwable $e) {
            Log::error("[ExecuteWorkflowNodeJob] Node {$this->nodeId} failed for run {$run->id}: ".$e->getMessage());
            $step->update(['status' => 'failed', 'error_message' => $e->getMessage(), 'completed_at' => now()]);
            $this->failRun($run, $e->getMessage());
        }
    }

    /**
     * @param  array<int, string>  $nodeIds
     */
    protected function dispatchNext(array $nodeIds, int $delaySeconds = 0): void
    {
        if (empty($nodeIds)) {
            $this->completeRun(WorkflowRun::find($this->workflowRunId));

            return;
        }

        foreach ($nodeIds as $nodeId) {
            if ($delaySeconds > 0) {
                self::dispatch($this->workflowRunId, $nodeId, $this->hop + 1)->delay(now()->addSeconds($delaySeconds));
            } else {
                self::dispatch($this->workflowRunId, $nodeId, $this->hop + 1);
            }
        }
    }

    protected function completeRun(?WorkflowRun $run): void
    {
        $run?->update(['status' => 'completed', 'completed_at' => now()]);
    }

    protected function failRun(WorkflowRun $run, string $message): void
    {
        $run->update(['status' => 'failed', 'completed_at' => now()]);
    }
}
