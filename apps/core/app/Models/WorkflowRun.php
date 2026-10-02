<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowRun extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'workflow_runs';

    protected $fillable = [
        'automation_flow_id',
        'tenant_id',
        'customer_phone',
        'trigger_context',
        'status',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'trigger_context' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function automationFlow(): BelongsTo
    {
        return $this->belongsTo(AutomationFlow::class, 'automation_flow_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WorkflowRunStep::class, 'workflow_run_id');
    }
}
