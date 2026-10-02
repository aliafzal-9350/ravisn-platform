<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channel_identities', function (Blueprint $table) {
            // String, matching the tenant_id convention used by whatsapp_accounts,
            // campaigns and automation_flows.
            $table->string('tenant_id')->nullable()->index()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('channel_identities', function (Blueprint $table) {
            $table->dropIndex(['tenant_id']);
            $table->dropColumn('tenant_id');
        });
    }
};
