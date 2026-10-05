<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Knowledge bases were global: every tenant's bot searched (and every admin
 * could edit) the same chunks. Each knowledge base now belongs to a tenant, and
 * chunks carry the owner too so the agent's vector search can filter on it
 * without a join.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knowledge_bases', function (Blueprint $table) {
            // String, matching the tenant_id convention of channel_identities etc.
            $table->string('tenant_id')->nullable()->index();
        });

        Schema::table('knowledge_chunks', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->index();
        });

        $this->claimLegacyKnowledge();

        // Denormalise each knowledge base's owner onto its chunks.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('UPDATE knowledge_chunks SET tenant_id = kb.tenant_id FROM knowledge_bases kb WHERE kb.id = knowledge_chunks.knowledge_base_id AND kb.tenant_id IS NOT NULL');
        }
    }

    /**
     * Decide who owns knowledge created before tenancy existed.
     *
     * 1. The platform's own RAVISN workspace, when it exists: the pre-tenancy
     *    knowledge base holds RAVISN's agency content (see KnowledgeBaseSeeder).
     * 2. Otherwise the only workspace, when there is exactly one.
     * 3. Otherwise nobody. Unowned rows are invisible to every tenant (no admin
     *    sees them, no bot retrieves from them), which is safer than guessing
     *    and handing one client's knowledge to another.
     *
     * Public so the rule can be tested on its own.
     */
    public function claimLegacyKnowledge(): void
    {
        if (! DB::table('knowledge_bases')->whereNull('tenant_id')->exists()) {
            return;
        }

        $owner = DB::table('tenants')->where('email', 'admin@ravisn.com')->value('id');

        if ($owner === null && DB::table('tenants')->count() === 1) {
            $owner = DB::table('tenants')->value('id');
        }

        if ($owner === null) {
            return;
        }

        $legacyIds = DB::table('knowledge_bases')->whereNull('tenant_id')->pluck('id');

        DB::table('knowledge_bases')->whereIn('id', $legacyIds)->update(['tenant_id' => (string) $owner]);
        DB::table('knowledge_chunks')->whereIn('knowledge_base_id', $legacyIds)->update(['tenant_id' => (string) $owner]);
    }

    public function down(): void
    {
        Schema::table('knowledge_chunks', function (Blueprint $table) {
            $table->dropIndex(['tenant_id']);
            $table->dropColumn('tenant_id');
        });

        Schema::table('knowledge_bases', function (Blueprint $table) {
            $table->dropIndex(['tenant_id']);
            $table->dropColumn('tenant_id');
        });
    }
};
