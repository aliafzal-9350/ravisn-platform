<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unified_campaigns')) {
            Schema::create('unified_campaigns', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                    $table->foreignUuid('channel_identity_id')->constrained('channel_identities')->cascadeOnDelete();
                } else {
                    $table->uuid('id')->primary();
                    $table->uuid('channel_identity_id');
                }
                $table->string('name');
                $table->string('status', 50)->default('draft');
                $table->string('template_name')->nullable();
                $table->string('template_language', 10)->default('en_US');
                if (DB::getDriverName() === 'pgsql') {
                    $table->jsonb('template_variables')->default('{}');
                    $table->jsonb('audience_filters')->default('{}');
                } else {
                    $table->json('template_variables')->nullable();
                    $table->json('audience_filters')->nullable();
                }
                $table->integer('total_recipients')->default(0);
                $table->integer('sent_count')->default(0);
                $table->integer('delivered_count')->default(0);
                $table->integer('read_count')->default(0);
                $table->integer('failed_count')->default(0);
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('unified_campaign_recipients')) {
            Schema::create('unified_campaign_recipients', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                    $table->foreignUuid('campaign_id')->constrained('unified_campaigns')->cascadeOnDelete();
                    $table->foreignUuid('contact_id')->constrained('contacts')->cascadeOnDelete();
                } else {
                    $table->uuid('id')->primary();
                    $table->uuid('campaign_id');
                    $table->uuid('contact_id');
                }
                $table->string('status', 50)->default('queued');
                $table->string('external_message_id')->nullable()->index();
                $table->text('error_message')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('unified_campaign_recipients');
        Schema::dropIfExists('unified_campaigns');
    }
};
