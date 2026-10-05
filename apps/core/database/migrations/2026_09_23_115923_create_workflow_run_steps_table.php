<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_run_steps', function (Blueprint $table) {
            if (DB::getDriverName() === 'pgsql') {
                $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                $table->foreignUuid('workflow_run_id')->constrained('workflow_runs')->cascadeOnDelete();
            } else {
                $table->uuid('id')->primary();
                $table->uuid('workflow_run_id');
            }
            $table->string('node_id');
            $table->string('action_type')->nullable();
            $table->string('status')->default('pending'); // pending|running|completed|failed|skipped
            $table->json('output')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['workflow_run_id', 'node_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_run_steps');
    }
};
