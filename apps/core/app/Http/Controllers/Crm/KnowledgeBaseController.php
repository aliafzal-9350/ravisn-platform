<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KnowledgeBaseController extends Controller
{
    public function index(): JsonResponse
    {
        $bases = KnowledgeBase::withCount('chunks')->get();
        return response()->json($bases);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $base = KnowledgeBase::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'embedding_model' => 'text-embedding-3-small',
            'dimension' => 1536,
            'is_active' => true,
        ]);

        return response()->json($base, 201);
    }

    public function addChunk(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        $base = KnowledgeBase::findOrFail($id);

        // Forward to FastAPI agent for embedding computation and indexing
        $agentUrl = config('services.agent.url', env('AGENT_API_URL', 'http://agent:8000'));
        try {
            $resp = Http::post("{$agentUrl}/api/v1/knowledge/chunks", [
                'knowledge_base_id' => $base->id,
                'content' => $validated['content'],
                'metadata' => $validated['metadata'] ?? [],
            ]);

            if ($resp->successful()) {
                return response()->json($resp->json(), 201);
            }
        } catch (\Throwable $e) {
            Log::warning("[KnowledgeBaseController] Failed to index via agent: " . $e->getMessage());
        }

        // Local fallback chunk creation
        $chunk = KnowledgeChunk::create([
            'knowledge_base_id' => $base->id,
            'content' => $validated['content'],
            'metadata' => $validated['metadata'] ?? [],
        ]);

        return response()->json($chunk, 201);
    }
}
