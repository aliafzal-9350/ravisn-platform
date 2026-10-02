<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeIngestionJob extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'knowledge_ingestion_jobs';

    protected $fillable = [
        'knowledge_base_id',
        'uploaded_by_user_id',
        'title',
        'original_filename',
        'file_path',
        'status',
        'error_message',
        'chunks_indexed',
        'char_count',
    ];

    protected function casts(): array
    {
        return [
            'chunks_indexed' => 'integer',
            'char_count' => 'integer',
        ];
    }

    public function knowledgeBase(): BelongsTo
    {
        return $this->belongsTo(KnowledgeBase::class, 'knowledge_base_id');
    }
}
