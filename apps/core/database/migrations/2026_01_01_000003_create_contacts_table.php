<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contacts')) {
            Schema::create('contacts', function (Blueprint $table) {
                if (DB::getDriverName() === 'pgsql') {
                    $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
                } else {
                    $table->uuid('id')->primary();
                }
                $table->string('first_name')->nullable();
                $table->string('last_name')->nullable();
                $table->string('phone_number', 50)->nullable()->index()->comment('E.164 phone for WhatsApp');
                $table->string('messenger_psid', 100)->nullable()->index()->comment('Meta Page-Scoped ID');
                $table->string('instagram_igsid', 100)->nullable()->index()->comment('Instagram-Scoped ID');
                $table->string('email')->nullable()->index();
                if (DB::getDriverName() === 'pgsql') {
                    $table->jsonb('custom_attributes')->default('{}');
                    $table->jsonb('tags')->default('[]');
                } else {
                    $table->json('custom_attributes')->nullable();
                    $table->json('tags')->nullable();
                }
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
