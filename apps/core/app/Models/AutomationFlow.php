<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'name',
    'trigger_type',
    'trigger_keyword',
    'trigger_match_type',
    'actions',
    'visual_graph',
    'is_active',
])]
class AutomationFlow extends Model
{
    use HasFactory;

    /**
     * The data type of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';



    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'tenant_id' => 'string',
            'actions' => 'array',
            'visual_graph' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the tenant that owns the automation flow.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
