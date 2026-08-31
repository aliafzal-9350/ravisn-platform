<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Disable transaction wrapping for CockroachDB compatibility.
     *
     * @var bool
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('ai_strategy')->default('lead_qualifier')->after('webhook_token');
        });

        Schema::table('whatsapp_chats', function (Blueprint $table) {
            $table->boolean('is_ai_active')->default(true)->after('last_message_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('ai_strategy');
        });

        Schema::table('whatsapp_chats', function (Blueprint $table) {
            $table->dropColumn('is_ai_active');
        });
    }
};
