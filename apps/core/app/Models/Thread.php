<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Thread extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'threads';

    protected $fillable = [
        'contact_id',
        'channel_identity_id',
        'assigned_user_id',
        'channel_type',
        'status',
        'bot_active',
        'last_message_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'bot_active' => 'boolean',
            'last_message_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Restrict threads to those whose channel belongs to the given tenant.
     * A null/empty tenant matches nothing, so an unscoped caller never sees data.
     */
    public function scopeForTenant(Builder $query, int|string|null $tenantId): Builder
    {
        if ($tenantId === null || $tenantId === '') {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereHas('channelIdentity', fn (Builder $channel) => $channel->where('tenant_id', (string) $tenantId));
    }

    /**
     * The owning tenant: the channel's tenant, falling back to the contact's.
     */
    public function tenantId(): ?string
    {
        $tenantId = $this->channelIdentity?->tenant_id ?? $this->contact?->tenant_id;

        return $tenantId === null ? null : (string) $tenantId;
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function channelIdentity(): BelongsTo
    {
        return $this->belongsTo(ChannelIdentity::class, 'channel_identity_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'thread_id')->orderBy('created_at', 'asc');
    }

    public function latestMessage(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Message::class, 'thread_id')->latestOfMany('created_at');
    }
}

