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
     * Rows left with tenant_id = NULL are invisible to every tenant: no admin
     * can see or edit them and no bot retrieves from them. That is the safe
     * default this method keeps if it does nothing.
     */
    protected function claimLegacyKnowledge(): void
    {
        // TODO(owner decision): assign the pre-tenancy knowledge base(s), e.g.
        //   - to the single tenant when only one exists,
        //   - to the platform's own workspace (looked up by email), or
        //   - leave them unowned (quarantined) and re-upload per tenant.
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
