<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('knowledge_bases')) {
            Schema::create('knowledge_bases', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                } else {
                    $table->uuid('id')->primary();
                }
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('embedding_model')->default('text-embedding-3-small');
                $table->integer('dimension')->default(1536);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('knowledge_chunks')) {
            Schema::create('knowledge_chunks', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                    $table->foreignUuid('knowledge_base_id')->constrained('knowledge_bases')->cascadeOnDelete();
                    $table->text('content');
                    $table->jsonb('metadata')->default('{}');
                } else {
                    $table->uuid('id')->primary();
                    $table->uuid('knowledge_base_id');
                    $table->text('content');
                    $table->json('metadata')->nullable();
                }
                $table->timestamps();
            });

            // Add pgvector column and HNSW cosine index when running PostgreSQL
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);');
                DB::statement('CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);');
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_chunks');
        Schema::dropIfExists('knowledge_bases');
    }
};
