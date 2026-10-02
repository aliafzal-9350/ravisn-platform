<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_ingestion_jobs', function (Blueprint $table) {
            if (DB::getDriverName() === 'pgsql') {
                $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                $table->foreignUuid('knowledge_base_id')->constrained('knowledge_bases')->cascadeOnDelete();
                $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            } else {
                $table->uuid('id')->primary();
                $table->uuid('knowledge_base_id');
                $table->unsignedBigInteger('uploaded_by_user_id')->nullable();
            }
            $table->string('title');
            $table->string('original_filename');
            $table->string('file_path')->nullable();
            $table->string('status')->default('pending'); // pending|parsing|chunking|embedding|completed|failed
            $table->text('error_message')->nullable();
            $table->unsignedInteger('chunks_indexed')->nullable();
            $table->unsignedInteger('char_count')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_ingestion_jobs');
    }
};
