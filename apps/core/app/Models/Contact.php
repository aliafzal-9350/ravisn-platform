<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'first_name',
        'last_name',
        'name',
        'phone',
        'phone_number',
        'messenger_psid',
        'instagram_igsid',
        'email',
        'company_name',
        'industry',
        'lead_stage',
        'opted_out',
        'last_inbound_at',
        'notes',
        'internal_notes',
        'custom_attributes',
        'tags',
        'var1',
        'var2',
        'var3',
        'var4',
        'var5',
    ];

    protected function casts(): array
    {
        return [
            'opted_out' => 'boolean',
            'last_inbound_at' => 'datetime',
            'custom_attributes' => 'array',
            'tags' => 'array',
        ];
    }

    public function getIsOptedOutAttribute(): bool
    {
        return (bool) ($this->opted_out ?? false);
    }

    public function scopeNotOptedOut($query)
    {
        return $query->where(function ($q) {
            $q->where('opted_out', false)->orWhereNull('opted_out');
        });
    }

    public function getInternalNotesAttribute($value): ?string
    {
        return $value ?? $this->notes;
    }

    public function getCompanyNameAttribute($value): ?string
    {
        return $value ?? ($this->custom_attributes['company_name'] ?? null);
    }

    public function getIndustryAttribute($value): ?string
    {
        return $value ?? ($this->custom_attributes['industry'] ?? null);
    }

    /**
     * Stage of a contact nobody has qualified yet. Never assume more than that.
     */
    public const DEFAULT_LEAD_STAGE = 'New Lead';

    public function getLeadStageAttribute($value): ?string
    {
        return $value ?? ($this->custom_attributes['lead_stage'] ?? self::DEFAULT_LEAD_STAGE);
    }

    public function getFullNameAttribute(): string
    {
        if ($this->first_name || $this->last_name) {
            return trim("{$this->first_name} {$this->last_name}");
        }
        return $this->name ?? $this->phone_number ?? $this->phone ?? 'Unknown Contact';
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(
            ContactGroup::class,
            'contact_group_memberships',
            'contact_id',
            'contact_group_id'
        );
    }

    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class, 'contact_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'contact_id');
    }
}
