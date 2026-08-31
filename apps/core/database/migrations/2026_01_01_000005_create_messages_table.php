<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('messages')) {
            Schema::create('messages', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                    $table->foreignUuid('thread_id')->constrained('threads')->cascadeOnDelete();
                    $table->foreignUuid('contact_id')->constrained('contacts')->cascadeOnDelete();
                    $table->uuid('user_id')->nullable()->comment('Null if inbound or AI');
                } else {
                    $table->uuid('id')->primary();
                    $table->uuid('thread_id');
                    $table->uuid('contact_id');
                    $table->uuid('user_id')->nullable();
                }
                $table->string('direction', 20)->index()->comment('inbound, outbound');
                $table->string('channel_type', 50);
                $table->string('external_message_id')->nullable()->index()->comment('wamid or Meta mid');
                $table->string('message_type', 50)->default('text')->comment('text, audio, image, video, document, template, interactive');
                $table->text('content')->nullable();
                $table->string('media_url', 1000)->nullable();
                $table->string('media_mime_type', 100)->nullable();
                $table->string('status', 50)->default('received')->index()->comment('received, queued, sent, delivered, read, failed');

                // AI Telemetry Fields
                $table->boolean('is_ai_generated')->default(false);
                $table->string('ai_model', 100)->nullable();
                $table->string('detected_intent', 100)->nullable();
                $table->integer('prompt_tokens')->nullable();
                $table->integer('completion_tokens')->nullable();
                $table->integer('latency_ms')->nullable();
                $table->decimal('confidence_score', 5, 4)->nullable();

                if (DB::getDriverName() === 'pgsql') {
                    $table->jsonb('raw_payload')->default('{}');
                } else {
                    $table->json('raw_payload')->nullable();
                }

                $table->timestamps();
                $table->index(['thread_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
