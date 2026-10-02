<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_runs', function (Blueprint $table) {
            if (DB::getDriverName() === 'pgsql') {
                $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                $table->foreignId('automation_flow_id')->constrained('automation_flows')->cascadeOnDelete();
            } else {
                $table->uuid('id')->primary();
                $table->unsignedBigInteger('automation_flow_id');
            }
            $table->string('tenant_id')->index();
            $table->string('customer_phone');
            $table->json('trigger_context')->nullable();
            $table->string('status')->default('pending'); // pending|running|completed|failed
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_runs');
    }
};
