<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeChunk extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'knowledge_chunks';

    protected $fillable = [
        'knowledge_base_id',
        'tenant_id',
        'content',
        'metadata',
        'embedding',
    ];

    protected function casts(): array
    {
        return [
            'tenant_id' => 'string',
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // Chunks carry their knowledge base's owner so the agent's vector
        // search can filter by tenant without a join.
        static::creating(function (KnowledgeChunk $chunk) {
            if (empty($chunk->tenant_id) && $chunk->knowledge_base_id) {
                $chunk->tenant_id = KnowledgeBase::whereKey($chunk->knowledge_base_id)->value('tenant_id');
            }
        });
    }

    public function knowledgeBase(): BelongsTo
    {
        return $this->belongsTo(KnowledgeBase::class, 'knowledge_base_id');
    }

    /**
     * Restrict chunks to those owned by the given tenant.
     */
    public function scopeForTenant(Builder $query, int|string|null $tenantId): Builder
    {
        return $query->where('tenant_id', (string) $tenantId);
    }
}
