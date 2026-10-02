<?php

use App\Jobs\ProcessKnowledgeIngestionJob;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use App\Models\Tenant;
use App\Models\KnowledgeIngestionJob;
use App\Models\User;
use App\Services\DocumentParser;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function fakeEmbeddingResponse(): array
{
    return array_fill(0, 1536, 0.01);
}

test('uploading a document file dispatches an async ingestion job instead of processing synchronously', function () {
    Queue::fake();
    Storage::fake('local');
    $user = User::factory()->for(Tenant::factory())->create();

    $response = $this->actingAs($user)->postJson('/dashboard/knowledge/upload', [
        'file' => UploadedFile::fake()->createWithContent('notes.txt', 'Our support hours are 9am to 5pm.'),
    ]);

    $response->assertOk()->assertJson(['status' => 'processing']);
    expect($response->json('job_id'))->not->toBeNull();

    Queue::assertPushed(ProcessKnowledgeIngestionJob::class);
    $this->assertDatabaseHas('knowledge_ingestion_jobs', [
        'id' => $response->json('job_id'),
        'status' => 'pending',
        'original_filename' => 'notes.txt',
    ]);
});

test('ingestion job parses, chunks, embeds and completes for a text file', function () {
    Storage::fake('local');
    Http::fake([
        '*/api/v1/knowledge/embed' => Http::response(['embedding' => fakeEmbeddingResponse()], 200),
    ]);

    $kb = KnowledgeBase::forTenantOrCreate(Tenant::factory()->create());

    $storedPath = Storage::disk('local')->put('kb-uploads', UploadedFile::fake()->createWithContent('policy.txt', 'Refunds are processed within 7 business days.'));

    $ingestionJob = KnowledgeIngestionJob::create([
        'knowledge_base_id' => $kb->id,
        'title' => 'policy.txt',
        'original_filename' => 'policy.txt',
        'file_path' => $storedPath,
        'status' => 'pending',
    ]);

    (new ProcessKnowledgeIngestionJob((string) $ingestionJob->id))->handle(app(DocumentParser::class));

    $ingestionJob->refresh();
    expect($ingestionJob->status)->toBe('completed');
    expect($ingestionJob->chunks_indexed)->toBeGreaterThan(0);

    // Chunks inherit the knowledge base's owner so retrieval can filter on it.
    $this->assertDatabaseHas('knowledge_chunks', [
        'knowledge_base_id' => $kb->id,
        'tenant_id' => $kb->tenant_id,
    ]);
});

test('ingestion job fails loudly and indexes nothing when the embedding service is unavailable', function () {
    Storage::fake('local');
    Http::fake([
        '*/api/v1/knowledge/embed' => Http::response([], 500),
    ]);

    $kb = KnowledgeBase::forTenantOrCreate(Tenant::factory()->create());

    $storedPath = Storage::disk('local')->put('kb-uploads', UploadedFile::fake()->createWithContent('outage.txt', 'This content should never be indexed with a fake vector.'));

    $ingestionJob = KnowledgeIngestionJob::create([
        'knowledge_base_id' => $kb->id,
        'title' => 'outage.txt',
        'original_filename' => 'outage.txt',
        'file_path' => $storedPath,
        'status' => 'pending',
    ]);

    $chunksBefore = KnowledgeChunk::where('knowledge_base_id', $kb->id)->count();

    (new ProcessKnowledgeIngestionJob((string) $ingestionJob->id))->handle(app(DocumentParser::class));

    $ingestionJob->refresh();
    expect($ingestionJob->status)->toBe('failed');
    expect($ingestionJob->error_message)->not->toBeNull();

    $chunksAfter = KnowledgeChunk::where('knowledge_base_id', $kb->id)->count();
    expect($chunksAfter)->toBe($chunksBefore);
});
