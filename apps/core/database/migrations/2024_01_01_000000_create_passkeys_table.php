<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Disable transaction wrapping for CockroachDB distributed DDL compatibility.
     *
     * @var bool
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $userIdType = DB::selectOne(
            "select data_type from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'id'"
        )?->data_type;
        $usesStringUserId = $userIdType === 'character varying';

        if (! Schema::hasTable('passkeys')) {
            Schema::create('passkeys', function (Blueprint $table) use ($usesStringUserId) {
                $table->id();
                $usesStringUserId ? $table->string('user_id')->index() : $table->foreignId('user_id')->index();
                $table->string('name');
                $table->string('credential_id')->unique();
                $table->json('credential');
                $table->timestamp('last_used_at')->nullable();
                $table->timestamps();
            });
        } elseif (Schema::hasColumn('passkeys', 'user_id')) {
            $passkeyUserIdType = DB::selectOne(
                "select data_type from information_schema.columns where table_schema = 'public' and table_name = 'passkeys' and column_name = 'user_id'"
            )?->data_type;

            if ($usesStringUserId && $passkeyUserIdType !== 'character varying') {
                DB::statement("alter table passkeys alter column user_id type varchar(255) using user_id::text");
            }
        }

        $hasUserForeignKey = DB::selectOne(
            "select 1 from pg_constraint where conrelid = 'passkeys'::regclass and contype = 'f' and conname = 'passkeys_user_id_foreign'"
        );

        if (! $hasUserForeignKey) {
            Schema::table('passkeys', function (Blueprint $table) use ($usesStringUserId) {
                $usesStringUserId
                    ? $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete()
                    : $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('passkeys');
    }
};
