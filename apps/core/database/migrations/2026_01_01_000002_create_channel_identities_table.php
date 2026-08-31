<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('channel_identities')) {
            Schema::create('channel_identities', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                } else {
                    $table->uuid('id')->primary();
                }
                $table->string('channel_type', 50)->index()->comment('whatsapp, messenger, instagram');
                $table->string('account_name');
                $table->string('external_id')->unique()->comment('WABA Phone ID, FB Page ID, or IG Account ID');
                $table->string('business_account_id')->nullable()->comment('Meta WABA ID or Business Manager ID');
                $table->text('access_token')->comment('System User Access Token');
                $table->string('webhook_verify_token');
                $table->boolean('is_active')->default(true);
                if (DB::getDriverName() === 'pgsql') {
                    $table->jsonb('settings')->default('{}');
                } else {
                    $table->json('settings')->nullable();
                }
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_identities');
    }
};
