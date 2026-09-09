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
        if (! Schema::hasTable('contact_groups')) {
            Schema::create('contact_groups', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id')->index();
                $table->string('name');
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('contact_group_memberships')) {
            Schema::create('contact_group_memberships', function (Blueprint $table) {
                $table->foreignUuid('contact_id')->constrained('contacts')->cascadeOnDelete();
                $table->foreignId('contact_group_id')->constrained('contact_groups')->cascadeOnDelete();

                $table->primary(['contact_id', 'contact_group_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_group_memberships');
        Schema::dropIfExists('contact_groups');
    }
};
