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
        if (! Schema::hasTable('api_keys')) {
            Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('name');
            $table->string('key', 64)->unique(); // store sha256 hash of the key
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

        });
        }

        if (! Schema::hasTable('outgoing_webhooks')) {
            Schema::create('outgoing_webhooks', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('url');
            $table->string('secret_token');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outgoing_webhooks');
        Schema::dropIfExists('api_keys');
    }
};
