<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        if (! Schema::hasTable('tenants')) {
            Schema::create('tenants', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('status')->default('active');
                $table->string('webhook_token')->nullable()->unique();
                $table->string('meta_business_id')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('tenants', function (Blueprint $table) {
                if (! Schema::hasColumn('tenants', 'email')) {
                    $table->string('email')->nullable()->unique();
                }
                if (! Schema::hasColumn('tenants', 'status')) {
                    $table->string('status')->default('active');
                }
                if (! Schema::hasColumn('tenants', 'webhook_token')) {
                    $table->string('webhook_token')->nullable()->unique();
                }
                if (! Schema::hasColumn('tenants', 'meta_business_id')) {
                    $table->string('meta_business_id')->nullable();
                }
                if (! Schema::hasColumn('tenants', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable();
                }
            });
        }

        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('role')->default('client');
                $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->text('two_factor_secret')->nullable();
                $table->text('two_factor_recovery_codes')->nullable();
                $table->timestamp('two_factor_confirmed_at')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        } else {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'name')) {
                    $table->string('name')->nullable();
                }
                if (! Schema::hasColumn('users', 'role')) {
                    $table->string('role')->default('client');
                }
                if (! Schema::hasColumn('users', 'email_verified_at')) {
                    $table->timestamp('email_verified_at')->nullable();
                }
                if (! Schema::hasColumn('users', 'password')) {
                    $table->string('password')->nullable();
                }
                if (! Schema::hasColumn('users', 'two_factor_secret')) {
                    $table->text('two_factor_secret')->nullable();
                }
                if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                    $table->text('two_factor_recovery_codes')->nullable();
                }
                if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                    $table->timestamp('two_factor_confirmed_at')->nullable();
                }
                if (! Schema::hasColumn('users', 'remember_token')) {
                    $table->rememberToken();
                }
                if (! Schema::hasColumn('users', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable();
                }
            });

            if (Schema::hasColumn('users', 'hashed_password')) {
                DB::table('users')
                    ->whereNull('password')
                    ->whereNotNull('hashed_password')
                    ->update(['password' => DB::raw('hashed_password')]);
            }
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
