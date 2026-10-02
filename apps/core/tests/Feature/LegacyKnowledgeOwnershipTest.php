<?php

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A knowledge base (with one chunk) as it existed before tenancy: no owner.
 */
function legacyKnowledgeBase(): string
{
    $id = (string) Str::uuid();
    DB::table('knowledge_bases')->insert([
        'id' => $id, 'name' => 'RAVISN Enterprise Knowledge Base', 'embedding_model' => 'text-embedding-3-small',
        'dimension' => 1536, 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('knowledge_chunks')->insert([
        'id' => (string) Str::uuid(), 'knowledge_base_id' => $id, 'content' => 'Legacy answer',
        'metadata' => '{}', 'created_at' => now(), 'updated_at' => now(),
    ]);

    return $id;
}

function claimLegacyKnowledge(): void
{
    $migration = require database_path('migrations/2026_10_02_000001_add_tenant_id_to_knowledge_tables.php');
    $migration->claimLegacyKnowledge();
}

test('the only workspace inherits the pre-tenancy knowledge base and its chunks', function () {
    $tenant = Tenant::factory()->create();
    $kbId = legacyKnowledgeBase();

    claimLegacyKnowledge();

    expect(DB::table('knowledge_bases')->where('id', $kbId)->value('tenant_id'))->toBe((string) $tenant->id)
        ->and(DB::table('knowledge_chunks')->where('knowledge_base_id', $kbId)->value('tenant_id'))->toBe((string) $tenant->id);
});

test('with several workspaces, the RAVISN platform workspace gets it', function () {
    Tenant::factory()->create();
    $ravisn = Tenant::factory()->create(['email' => 'admin@ravisn.com']);
    Tenant::factory()->create();
    $kbId = legacyKnowledgeBase();

    claimLegacyKnowledge();

    expect(DB::table('knowledge_bases')->where('id', $kbId)->value('tenant_id'))->toBe((string) $ravisn->id);
});

test('when the owner is ambiguous, the knowledge stays unowned instead of going to a client', function () {
    Tenant::factory()->count(2)->create();
    $kbId = legacyKnowledgeBase();

    claimLegacyKnowledge();

    expect(DB::table('knowledge_bases')->where('id', $kbId)->value('tenant_id'))->toBeNull()
        ->and(DB::table('knowledge_chunks')->where('knowledge_base_id', $kbId)->value('tenant_id'))->toBeNull();
});
