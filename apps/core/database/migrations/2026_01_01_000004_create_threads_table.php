<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('threads')) {
            Schema::create('threads', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                    $table->foreignUuid('contact_id')->constrained('contacts')->cascadeOnDelete();
                    $table->foreignUuid('channel_identity_id')->constrained('channel_identities')->cascadeOnDelete();
                    $table->uuid('assigned_user_id')->nullable();
                } else {
                    $table->uuid('id')->primary();
                    $table->uuid('contact_id');
                    $table->uuid('channel_identity_id');
                    $table->uuid('assigned_user_id')->nullable();
                }
                $table->string('channel_type', 50)->index();
                $table->string('status', 50)->default('open');
                $table->boolean('bot_active')->default(true)->comment('True = AI handles, False = Human takeover');
                $table->timestamp('last_message_at')->nullable()->index();
                if (DB::getDriverName() === 'pgsql') {
                    $table->jsonb('metadata')->default('{}');
                } else {
                    $table->json('metadata')->nullable();
                }
                $table->timestamps();
                $table->index(['channel_identity_id', 'contact_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('threads');
    }
};
