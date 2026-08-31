<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeBase extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'knowledge_bases';

    protected $fillable = [
        'name',
        'description',
        'embedding_model',
        'dimension',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'dimension' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(KnowledgeChunk::class, 'knowledge_base_id');
    }
}
