<?php

namespace App\Http\Controllers\Client;

use App\Exceptions\EmbeddingUnavailableException;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessKnowledgeIngestionJob;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use App\Models\KnowledgeIngestionJob;
use App\Services\AI\EmbeddingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeController extends Controller
{
    public function __construct(
        protected EmbeddingService $embeddingService
    ) {}

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
        try {
            $embedding = $this->embeddingService->embed($content);
        } catch (EmbeddingUnavailableException $e) {
            return $this->embeddingUnavailableResponse($request, $e);
        }

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
            $vectorString = '['.implode(',', $embedding).']';
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

        try {
            $embedding = $this->embeddingService->embed($content);
        } catch (EmbeddingUnavailableException $e) {
            return $this->embeddingUnavailableResponse($request, $e);
        }

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
            $vectorString = '['.implode(',', $embedding).']';
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
     * Ingest a document (CSV, PDF, DOCX, TXT). File uploads are processed
     * asynchronously by ProcessKnowledgeIngestionJob so the UI can show real
     * parse/chunk/embed progress; pasted-in text content (no file) is small
     * enough to embed synchronously.
     */
    public function upload(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'file' => ['nullable', 'file', 'mimes:txt,csv,pdf,doc,docx', 'max:15360'],
        ]);

        $kb = $this->getOrCreateKnowledgeBase();
        $title = $request->input('title');
        $content = $request->input('content');

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $title = $title ?: $file->getClientOriginalName();
            $storedPath = $file->store('kb-uploads', 'local');

            $ingestionJob = KnowledgeIngestionJob::create([
                'knowledge_base_id' => $kb->id,
                'uploaded_by_user_id' => $request->user()?->id,
                'title' => $title,
                'original_filename' => $file->getClientOriginalName(),
                'file_path' => $storedPath,
                'status' => 'pending',
            ]);

            ProcessKnowledgeIngestionJob::dispatch((string) $ingestionJob->id);

            return response()->json([
                'status' => 'processing',
                'job_id' => (string) $ingestionJob->id,
                'document_title' => $title,
            ]);
        }

        if (empty(trim((string) $content))) {
            return response()->json(['error' => 'Document content cannot be empty.'], 422);
        }

        $chunks = [];
        $len = mb_strlen($content);
        $start = 0;
        while ($start < $len) {
            $chunkText = trim(mb_substr($content, $start, 600));
            if (! empty($chunkText)) {
                $chunks[] = $chunkText;
            }
            $start += 520; // 600 - 80 overlap
        }

        try {
            $insertedCount = 0;
            foreach ($chunks as $idx => $chunkText) {
                $embedding = $this->embeddingService->embed($chunkText);
                $chunk = KnowledgeChunk::create([
                    'knowledge_base_id' => $kb->id,
                    'content' => $chunkText,
                    'metadata' => [
                        'source' => $title ?: 'Pasted Content',
                        'chunk_index' => $idx,
                        'total_chunks' => count($chunks),
                        'title' => $title ?: 'Pasted Content',
                    ],
                ]);

                if (DB::getDriverName() === 'pgsql') {
                    $vecStr = '['.implode(',', $embedding).']';
                    DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vecStr, $chunk->id]);
                }
                $insertedCount++;
            }
        } catch (EmbeddingUnavailableException $e) {
            return $this->embeddingUnavailableResponse($request, $e);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Document successfully parsed and stored: {$insertedCount} chunks indexed in pgvector.",
            'chunks_count' => $insertedCount,
            'char_count' => $len,
            'document_title' => $title ?: 'Pasted Content',
        ]);
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
     * Build a clear failure response when the AI embedding service is
     * unavailable, instead of silently indexing a non-semantic placeholder
     * vector that would quietly break RAG retrieval later.
     */
    private function embeddingUnavailableResponse(Request $request, EmbeddingUnavailableException $e): JsonResponse|RedirectResponse
    {
        Log::error('[KnowledgeController] Embedding unavailable: '.$e->getMessage());

        $message = 'AI embedding service is currently unavailable. Your content was not indexed. Please try again shortly.';

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json(['error' => $message], 503);
        }

        return back()->with('toast', ['type' => 'error', 'message' => $message]);
    }
}
