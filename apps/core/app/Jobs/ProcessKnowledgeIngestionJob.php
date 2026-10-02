<?php

namespace App\Jobs;

use App\Events\KnowledgeIngestionProgressEvent;
use App\Exceptions\EmbeddingUnavailableException;
use App\Models\KnowledgeChunk;
use App\Models\KnowledgeIngestionJob;
use App\Services\AI\EmbeddingService;
use App\Services\DocumentParser;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessKnowledgeIngestionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(
        public string $knowledgeIngestionJobId
    ) {}

    public function handle(DocumentParser $parser): void
    {
        $job = KnowledgeIngestionJob::findOrFail($this->knowledgeIngestionJobId);

        try {
            $this->transition($job, 'parsing');

            $extension = strtolower(pathinfo($job->original_filename, PATHINFO_EXTENSION));
            $absolutePath = Storage::disk('local')->path($job->file_path);

            if ($extension === 'csv') {
                $this->ingestCsv($job, $absolutePath);

                return;
            }

            $parsed = $parser->extractText($absolutePath, $extension);
            if (! $parsed['success'] || empty(trim($parsed['text']))) {
                $this->fail($job, $parsed['error'] ?? 'No readable text could be extracted from this document.');

                return;
            }

            $job->update(['char_count' => mb_strlen($parsed['text'])]);
            $this->ingestPlainText($job, $parsed['text']);
        } catch (\Throwable $e) {
            Log::error('[ProcessKnowledgeIngestionJob] Ingestion failed: '.$e->getMessage());
            $this->fail($job, 'An unexpected error occurred while processing this document.');
        } finally {
            $this->cleanupStoredFile($job);
        }
    }

    /**
     * Split plain text into overlapping chunks, embed each, and store it —
     * broadcasting progress at each phase boundary.
     */
    protected function ingestPlainText(KnowledgeIngestionJob $job, string $text): void
    {
        $this->transition($job, 'chunking');

        $chunks = [];
        $len = mb_strlen($text);
        $start = 0;
        while ($start < $len) {
            $chunkText = trim(mb_substr($text, $start, 600));
            if (! empty($chunkText)) {
                $chunks[] = $chunkText;
            }
            $start += 520; // 600 - 80 overlap
        }

        $this->embedAndStoreChunks($job, $chunks, fn (string $chunk, int $index): array => [
            'source' => $job->title,
            'chunk_index' => $index,
            'total_chunks' => count($chunks),
            'title' => $job->title,
        ]);
    }

    /**
     * Parse a CSV upload into Q&A row chunks, embed each, and store it.
     */
    protected function ingestCsv(KnowledgeIngestionJob $job, string $absolutePath): void
    {
        $this->transition($job, 'chunking');

        $rows = array_map('str_getcsv', file($absolutePath));
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

        $qaPairs = [];
        foreach ($rows as $row) {
            if (empty($row) || ! isset($row[$qIdx]) || ! isset($row[$aIdx])) {
                continue;
            }
            $q = trim((string) $row[$qIdx]);
            $a = trim((string) $row[$aIdx]);
            if (! empty($q) && ! empty($a)) {
                $qaPairs[] = [$q, $a];
            }
        }

        $job->update(['char_count' => array_sum(array_map(fn ($pair) => mb_strlen($pair[0]) + mb_strlen($pair[1]), $qaPairs))]);

        $chunks = array_map(fn ($pair) => "Question: {$pair[0]}\n\nAnswer: {$pair[1]}", $qaPairs);

        $this->embedAndStoreChunks($job, $chunks, fn (string $chunk, int $index): array => [
            'type' => 'qa',
            'question' => $qaPairs[$index][0],
            'answer' => $qaPairs[$index][1],
            'title' => $qaPairs[$index][0],
            'source' => $job->title,
        ]);
    }

    /**
     * Embed and persist each chunk. Fails the whole job loudly the moment
     * the embedding service becomes unavailable, rather than silently
     * indexing a non-semantic placeholder vector for the remaining chunks.
     *
     * @param  \Closure(string, int): array  $metadataFor
     */
    protected function embedAndStoreChunks(KnowledgeIngestionJob $job, array $chunks, \Closure $metadataFor): void
    {
        $this->transition($job, 'embedding');

        $embeddingService = app(EmbeddingService::class);
        $indexed = 0;

        try {
            foreach ($chunks as $index => $chunkText) {
                $embedding = $embeddingService->embed($chunkText);

                $chunk = KnowledgeChunk::create([
                    'knowledge_base_id' => $job->knowledge_base_id,
                    'content' => $chunkText,
                    'metadata' => $metadataFor($chunkText, $index),
                ]);

                if (DB::getDriverName() === 'pgsql') {
                    $vectorString = '['.implode(',', $embedding).']';
                    DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vectorString, $chunk->id]);
                }

                $indexed++;
            }
        } catch (EmbeddingUnavailableException $e) {
            $job->update(['chunks_indexed' => $indexed]);
            $this->fail($job, "AI embedding service is currently unavailable. Indexed {$indexed} of ".count($chunks).' chunks before failing.');

            return;
        }

        $job->update(['status' => 'completed', 'chunks_indexed' => $indexed]);
        broadcast(new KnowledgeIngestionProgressEvent($job->fresh()));
    }

    protected function transition(KnowledgeIngestionJob $job, string $status): void
    {
        $job->update(['status' => $status]);
        broadcast(new KnowledgeIngestionProgressEvent($job));
    }

    protected function fail(KnowledgeIngestionJob $job, string $message): void
    {
        $job->update(['status' => 'failed', 'error_message' => $message]);
        broadcast(new KnowledgeIngestionProgressEvent($job));
    }

    protected function cleanupStoredFile(KnowledgeIngestionJob $job): void
    {
        if ($job->file_path && Storage::disk('local')->exists($job->file_path)) {
            Storage::disk('local')->delete($job->file_path);
        }
    }
}
