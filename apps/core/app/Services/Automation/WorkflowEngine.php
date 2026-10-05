<?php

namespace App\Services\Automation;

use App\Jobs\ExecuteWorkflowNodeJob;
use App\Models\AutomationFlow;
use App\Models\WorkflowRun;

/**
 * Starts an async, queue-driven execution of an AutomationFlow's
 * visual_graph (or plain sequential actions list, for flows built before
 * the graph builder existed). Each node runs as its own queued
 * ExecuteWorkflowNodeJob rather than executing the whole flow synchronously
 * inside the inbound webhook request.
 */
class WorkflowEngine
{
    /**
     * The synthetic node-id prefix used to address a plain sequential
     * actions list (no visual_graph) as a linear chain of "nodes".
     */
    public const SEQUENTIAL_PREFIX = 'seq:';

    public function startRun(AutomationFlow $flow, array $triggerContext): WorkflowRun
    {
        $run = WorkflowRun::create([
            'automation_flow_id' => $flow->id,
            'tenant_id' => $flow->tenant_id,
            'customer_phone' => $triggerContext['customer_phone'],
            'trigger_context' => $triggerContext,
            'status' => 'running',
            'started_at' => now(),
        ]);

        $firstNodeId = $this->firstNodeId($flow);

        if ($firstNodeId === null) {
            $run->update(['status' => 'completed', 'completed_at' => now()]);

            return $run;
        }

        ExecuteWorkflowNodeJob::dispatch($run->id, $firstNodeId);

        return $run;
    }

    /**
     * Resolve the first node to execute: the target of the 'start' edge in
     * a visual graph, or 'seq:0' for a plain sequential actions list.
     */
    public function firstNodeId(AutomationFlow $flow): ?string
    {
        $visualGraph = $flow->visual_graph;

        if (is_array($visualGraph) && ! empty($visualGraph['nodes']) && ! empty($visualGraph['edges'])) {
            foreach ($visualGraph['edges'] as $edge) {
                if (($edge['source'] ?? '') === 'start' && ! empty($edge['target'])) {
                    return $edge['target'];
                }
            }

            return null;
        }

        return ! empty($flow->actions) ? self::SEQUENTIAL_PREFIX.'0' : null;
    }

    /**
     * Resolve the action bound to a node id and the node id(s) that follow it.
     *
     * @return array{0: array|null, 1: array<int, string>}
     */
    public function resolveNode(AutomationFlow $flow, string $nodeId): array
    {
        if (str_starts_with($nodeId, self::SEQUENTIAL_PREFIX)) {
            $index = (int) substr($nodeId, strlen(self::SEQUENTIAL_PREFIX));
            $actions = $flow->actions ?? [];
            $action = $actions[$index] ?? null;
            $next = isset($actions[$index + 1]) ? [self::SEQUENTIAL_PREFIX.($index + 1)] : [];

            return [$action, $next];
        }

        $visualGraph = $flow->visual_graph ?? [];
        $currentNode = null;

        foreach ($visualGraph['nodes'] ?? [] as $node) {
            if (($node['id'] ?? '') === $nodeId) {
                $currentNode = $node;
                break;
            }
        }

        $action = null;
        if ($nodeId !== 'start' && $currentNode) {
            $actionIndex = $currentNode['data']['actionIndex'] ?? null;
            if ($actionIndex !== null && isset($flow->actions[$actionIndex])) {
                $action = $flow->actions[$actionIndex];
            }
        }

        $childEdges = array_values(array_filter(
            $visualGraph['edges'] ?? [],
            fn (array $edge): bool => ($edge['source'] ?? '') === $nodeId && ! empty($edge['target'])
        ));

        $next = array_map(fn (array $edge): string => $edge['target'], $childEdges);

        return [$action, $next];
    }
}
