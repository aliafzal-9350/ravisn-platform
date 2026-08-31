<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChannelIdentity extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'channel_identities';

    protected $fillable = [
        'channel_type',
        'account_name',
        'external_id',
        'business_account_id',
        'access_token',
        'webhook_verify_token',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class, 'channel_identity_id');
    }
}
