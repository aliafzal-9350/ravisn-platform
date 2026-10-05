<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Services\AI\AgentClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SimulatorController extends Controller
{
    /**
     * Display the Live AI Simulator / Playground.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('client/simulator/index', [
            'initialConfig' => [
                'channel' => 'whatsapp',
                'rag_enabled' => true,
            ],
            'samplePrompts' => [
                'Hi! What do you offer?',
                'How much does it cost?',
                'Can I book an appointment for tomorrow at 3 PM?',
                'I need to talk to a human support agent immediately.',
            ],
        ]);
    }

    /**
     * Run a test message through the tenant's own AI agent: its knowledge base
     * and its Prompt Tuning settings, exactly as a live customer would see it.
     */
    public function query(Request $request, AgentClient $agent): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'channel' => ['nullable', 'string', 'in:whatsapp,instagram,messenger'],
        ]);

        $tenant = $request->user()->tenant;
        abort_if($tenant === null, 403, 'Your account is not attached to a workspace.');

        $startTime = microtime(true);

        try {
            $response = $agent->request(30)->post('/api/v1/agent/execute', [
                'tenant_id' => (string) $tenant->id,
                // Throwaway ids: the simulator never touches a real conversation.
                'thread_id' => (string) Str::uuid(),
                'contact_id' => (string) Str::uuid(),
                'channel' => $request->input('channel', 'whatsapp'),
                'sender_id' => 'simulator',
                'message_type' => 'text',
                'content' => trim($request->input('message')),
                'ai_config' => $tenant->aiConfig(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('[SimulatorController] AI agent unreachable: '.$e->getMessage());

            return $this->unavailable();
        }

        if (! $response->successful() || ! filled($response->json('final_response'))) {
            Log::warning('[SimulatorController] AI agent returned no reply', ['status' => $response->status()]);

            return $this->unavailable();
        }

        $data = $response->json();
        $telemetry = $data['telemetry'] ?? [];
        $leadScoring = $telemetry['lead_scoring'] ?? null;
        $citedChunk = $telemetry['cited_chunk'] ?? null;

        return response()->json([
            'status' => 'success',
            'response' => $data['final_response'],
            'intent' => $data['intent'] ?? null,
            'decision' => $data['decision'] ?? 'reply',
            'rag_context' => $data['rag_context'] ?: null,
            'retrieved_chunks' => $citedChunk ? [[
                'source' => $citedChunk['title'] ?? $citedChunk['source'] ?? 'Knowledge Base',
                'score' => $citedChunk['score'] ?? null,
                'content' => $citedChunk['snippet'] ?? '',
            ]] : [],
            'provider_route' => $telemetry['model'] ?? null,
            'telemetry' => [
                'inference_ms' => $telemetry['latency_ms'] ?? null,
                'total_ms' => round((microtime(true) - $startTime) * 1000, 1),
                'prompt_tokens' => $telemetry['prompt_tokens'] ?? null,
                'completion_tokens' => $telemetry['completion_tokens'] ?? null,
            ],
            'lead_score' => is_array($leadScoring) ? [
                'score' => $leadScoring['lead_score'] ?? null,
                'category' => $leadScoring['lead_category'] ?? null,
            ] : null,
        ]);
    }

    /**
     * The AI engine could not answer. Say so plainly instead of inventing a reply.
     */
    private function unavailable(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'The AI engine is unavailable right now. Check that the agent service is running and an AI provider key is configured.',
        ], 503);
    }
}
