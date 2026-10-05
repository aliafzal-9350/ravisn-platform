<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeBase extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'knowledge_bases';

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'embedding_model',
        'dimension',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'tenant_id' => 'string',
            'dimension' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class, 'knowledge_base_id');
    }

    /**
     * Restrict knowledge bases to those owned by the given tenant.
     */
    public function scopeForTenant(Builder $query, int|string|null $tenantId): Builder
    {
        return $query->where('tenant_id', (string) $tenantId);
    }

    /**
     * The tenant's knowledge base, created on first use.
     */
    public static function forTenantOrCreate(Tenant $tenant): self
    {
        return static::firstOrCreate(
            ['tenant_id' => (string) $tenant->id],
            [
                'name' => "{$tenant->name} Knowledge Base",
                'description' => 'Company answers, products, services, and policies',
                'embedding_model' => 'text-embedding-3-small',
                'dimension' => 1536,
                'is_active' => true,
            ]
        );
    }
}
