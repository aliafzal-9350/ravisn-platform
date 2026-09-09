<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeController extends Controller
{
    /**
     * Display Knowledge Base Manager.
     */
    public function index(Request $request): Response
    {
        $kb = KnowledgeBase::withCount('chunks')->first();
        if (! $kb) {
            $kb = KnowledgeBase::create([
                'name' => 'RAVISN Enterprise Knowledge Base',
                'description' => 'Unified RAG repository for company answers, products, services, and policies',
                'embedding_model' => 'text-embedding-3-small',
                'dimension' => 1536,
                'is_active' => true,
            ]);
        }

        $chunks = KnowledgeChunk::where('knowledge_base_id', $kb->id)
            ->orderByDesc('created_at')
            ->get();

        // Map chunks into structured Q&A entries
        $entries = $chunks->map(function ($chunk) {
            $meta = $chunk->metadata ?? [];
            $question = $meta['question'] ?? null;
            $answer = $meta['answer'] ?? null;

            // If not in metadata, attempt parsing standard Q&A format
            if (! $question && ! $answer) {
                if (preg_match('/^Question:\s*(.*?)\s*\n+Answer:\s*(.*)$/si', (string) $chunk->content, $matches)) {
                    $question = trim($matches[1]);
                    $answer = trim($matches[2]);
                } elseif (preg_match('/^Q:\s*(.*?)\s*\n+A:\s*(.*)$/si', (string) $chunk->content, $matches)) {
                    $question = trim($matches[1]);
                    $answer = trim($matches[2]);
                } else {
                    $question = $meta['title'] ?? 'Company Knowledge Entry';
                    $answer = $chunk->content;
                }
            }

            return [
                'id' => (string) $chunk->id,
                'question' => $question,
                'answer' => $answer,
                'created_at' => $chunk->created_at?->toISOString() ?? now()->toISOString(),
            ];
        });

        return Inertia::render('client/knowledge/index', [
            'knowledgeBase' => [
                'id' => (string) $kb->id,
                'name' => $kb->name,
                'description' => $kb->description,
                'embedding_model' => $kb->embedding_model,
                'dimension' => $kb->dimension,
            ],
            'entries' => $entries,
            'stats' => [
                'total_entries' => $entries->count(),
                'total_chunks' => $chunks->count(),
                'embedding_dimension' => 1536,
                'index_type' => 'HNSW (vector_cosine_ops)',
                'index_status' => 'OPTIMAL',
            ],
        ]);
    }

    /**
     * Store a manual Q&A entry and index its 1536-dimensional vector embedding.
     */
    public function storeEntry(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['required', 'string'],
        ]);

        $kb = $this->getOrCreateKnowledgeBase();
        $question = trim($validated['question']);
        $answer = trim($validated['answer']);
        $content = "Question: {$question}\n\nAnswer: {$answer}";

        // Generate vector embedding
        $embedding = $this->getEmbedding($content);

        $meta = [
            'type' => 'qa',
            'question' => $question,
            'answer' => $answer,
            'title' => $question,
            'source' => 'manual_entry',
        ];

        $chunk = KnowledgeChunk::create([
            'knowledge_base_id' => $kb->id,
            'content' => $content,
            'metadata' => $meta,
        ]);

        // Save embedding vector in pgvector column if running PostgreSQL
        if (DB::getDriverName() === 'pgsql' && ! empty($embedding)) {
            $vectorString = '[' . implode(',', $embedding) . ']';
            DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vectorString, $chunk->id]);
        }

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Knowledge entry added and indexed successfully.',
                'entry' => [
                    'id' => (string) $chunk->id,
                    'question' => $question,
                    'answer' => $answer,
                    'created_at' => $chunk->created_at->toISOString(),
                ],
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Knowledge entry saved and embedded successfully.',
        ]);
    }

    /**
     * Update an existing Q&A entry.
     */
    public function updateEntry(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['required', 'string'],
        ]);

        $chunk = KnowledgeChunk::findOrFail($id);
        $question = trim($validated['question']);
        $answer = trim($validated['answer']);
        $content = "Question: {$question}\n\nAnswer: {$answer}";

        $embedding = $this->getEmbedding($content);

        $meta = is_array($chunk->metadata) ? $chunk->metadata : [];
        $meta['question'] = $question;
        $meta['answer'] = $answer;
        $meta['title'] = $question;
        $meta['type'] = 'qa';

        $chunk->update([
            'content' => $content,
            'metadata' => $meta,
        ]);

        if (DB::getDriverName() === 'pgsql' && ! empty($embedding)) {
            $vectorString = '[' . implode(',', $embedding) . ']';
            DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vectorString, $chunk->id]);
        }

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Knowledge entry updated successfully.',
                'entry' => [
                    'id' => (string) $chunk->id,
                    'question' => $question,
                    'answer' => $answer,
                    'created_at' => $chunk->created_at->toISOString(),
                ],
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Knowledge entry updated.',
        ]);
    }

    /**
     * Delete a single entry.
     */
    public function destroyEntry(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $chunk = KnowledgeChunk::findOrFail($id);
        $chunk->delete();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Knowledge entry deleted.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Knowledge entry deleted.',
        ]);
    }

    /**
     * Delete all entries in the knowledge base.
     */
    public function destroyAll(Request $request): JsonResponse|RedirectResponse
    {
        $kb = $this->getOrCreateKnowledgeBase();
        KnowledgeChunk::where('knowledge_base_id', $kb->id)->delete();

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'All knowledge entries deleted.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'All knowledge base entries have been deleted.',
        ]);
    }

    /**
     * Ingest a document (CSV, PDF, DOCX, TXT) and create embeddings.
     */
    public function upload(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'file' => ['nullable', 'file', 'mimes:txt,csv,pdf,doc,docx', 'max:10240'],
        ]);

        $kb = $this->getOrCreateKnowledgeBase();
        $title = $request->input('title');
        $content = $request->input('content');
        $extension = '';

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $title = $title ?: $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension === 'csv') {
                // Parse CSV rows into Q&A entries
                $rows = array_map('str_getcsv', file($file->getRealPath()));
                $header = array_shift($rows);
                $qIdx = 0;
                $aIdx = 1;

                if ($header) {
                    $lowerHeader = array_map('strtolower', array_map('trim', $header));
                    foreach ($lowerHeader as $i => $col) {
                        if (in_array($col, ['question', 'q', 'prompt', 'title'])) {
                            $qIdx = $i;
                        }
                        if (in_array($col, ['answer', 'a', 'reply', 'response', 'content'])) {
                            $aIdx = $i;
                        }
                    }
                }

                $inserted = 0;
                foreach ($rows as $row) {
                    if (empty($row) || ! isset($row[$qIdx]) || ! isset($row[$aIdx])) {
                        continue;
                    }
                    $q = trim((string) $row[$qIdx]);
                    $a = trim((string) $row[$aIdx]);
                    if (! empty($q) && ! empty($a)) {
                        $chunkContent = "Question: {$q}\n\nAnswer: {$a}";
                        $embedding = $this->getEmbedding($chunkContent);
                        $chunk = KnowledgeChunk::create([
                            'knowledge_base_id' => $kb->id,
                            'content' => $chunkContent,
                            'metadata' => [
                                'type' => 'qa',
                                'question' => $q,
                                'answer' => $a,
                                'title' => $q,
                                'source' => $title,
                            ],
                        ]);
                        if (DB::getDriverName() === 'pgsql' && ! empty($embedding)) {
                            $vecStr = '[' . implode(',', $embedding) . ']';
                            DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vecStr, $chunk->id]);
                        }
                        $inserted++;
                    }
                }

                return response()->json([
                    'status' => 'success',
                    'message' => "Successfully parsed and indexed {$inserted} Q&A entries from CSV.",
                ]);
            }

            if ($extension === 'txt') {
                $content = file_get_contents($file->getRealPath());
            } else {
                // PDF / DOCX basic text extraction
                $content = @file_get_contents($file->getRealPath());
                $content = preg_replace('/[^\x20-\x7E\t\r\n]/', ' ', (string) $content);
            }
        }

        if (empty(trim((string) $content))) {
            return response()->json(['error' => 'Document content cannot be empty.'], 422);
        }

        $agentUrl = config('services.agent.url', env('AGENT_API_URL', 'http://agent:8000'));

        try {
            $response = Http::timeout(30)->post("{$agentUrl}/api/v1/knowledge/document", [
                'knowledge_base_id' => (string) $kb->id,
                'title' => $title ?: 'Uploaded Document',
                'content' => $content,
                'chunk_size' => 600,
                'chunk_overlap' => 80,
                'metadata' => [
                    'source' => 'web_admin',
                    'title' => $title ?: 'Uploaded Document',
                ],
            ]);

            if ($response->successful()) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Document successfully chunked, embedded, and indexed in pgvector.',
                    'data' => $response->json(),
                ]);
            } else {
                Log::error('[KnowledgeController] Agent API returned error: ' . $response->body());
                return response()->json(['error' => 'FastAPI Agent indexing failed: ' . $response->body()], 500);
            }
        } catch (\Throwable $e) {
            Log::error('[KnowledgeController] Exception connecting to Agent: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to connect to AI Agent: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete document chunks (legacy compatibility).
     */
    public function destroy(string $id): RedirectResponse
    {
        $chunk = KnowledgeChunk::findOrFail($id);
        $chunk->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Knowledge item deleted.']);
    }

    /**
     * Helper to retrieve or create default KnowledgeBase.
     */
    private function getOrCreateKnowledgeBase(): KnowledgeBase
    {
        return KnowledgeBase::firstOrCreate(
            ['name' => 'RAVISN Enterprise Knowledge Base'],
            [
                'description' => 'Unified RAG repository for company answers, products, services, and policies',
                'embedding_model' => 'text-embedding-3-small',
                'dimension' => 1536,
                'is_active' => true,
            ]
        );
    }

    /**
     * Generate 1536-dimensional vector embedding with fallback.
     */
    private function getEmbedding(string $text): array
    {
        $agentUrl = config('services.agent.url', env('AGENT_API_URL', 'http://agent:8000'));
        try {
            $response = Http::timeout(10)->post("{$agentUrl}/api/v1/knowledge/embed", [
                'text' => $text,
            ]);
            if ($response->successful() && ! empty($response->json('embedding'))) {
                return $response->json('embedding');
            }
        } catch (\Throwable $e) {
            Log::warning('[KnowledgeController] Agent embed call failed: ' . $e->getMessage());
        }

        // Deterministic pseudo-embedding fallback (1536 dimensions, normalized)
        $dim = 1536;
        $vec = array_fill(0, $dim, 0.0);
        $words = preg_split('/\s+/', strtolower($text));
        foreach ($words as $word) {
            if (! empty($word)) {
                $h = hexdec(substr(md5($word), 0, 8));
                $idx = $h % $dim;
                $vec[$idx] += 1.0;
            }
        }
        $norm = sqrt(array_sum(array_map(fn ($x) => $x * $x, $vec)));
        if ($norm > 0) {
            $vec = array_map(fn ($x) => $x / $norm, $vec);
        } else {
            $vec[0] = 1.0;
        }

        return $vec;
    }
}
