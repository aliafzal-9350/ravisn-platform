<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customer media (images, voice notes, documents) is copied into our storage
 * because Meta's links expire and need the channel's token. `media_url` keeps
 * Meta's reference; `media_path` is our copy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('media_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('media_path');
        });
    }
};
