<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChannelIdentity extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'channel_identities';

    protected $fillable = [
        'tenant_id',
        'channel_type',
        'account_name',
        'external_id',
        'business_account_id',
        'access_token',
        'webhook_verify_token',
        'is_active',
        'settings',
    ];

    /**
     * Never serialised: an agent-role user or an API response must not be able
     * to read the Meta credentials of the channel.
     *
     * @var list<string>
     */
    protected $hidden = [
        'access_token',
        'webhook_verify_token',
    ];

    protected function casts(): array
    {
        return [
            // Encrypted at rest with APP_KEY; the Python agent decrypts it with
            // the same key (src/services/laravel_crypt.py).
            'access_token' => 'encrypted',
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class, 'channel_identity_id');
    }

    /**
     * Where the browser loads this channel's profile picture: our stored copy
     * (see ChannelAvatarStore), or a Meta link saved before copies were kept.
     */
    public function avatarUrl(): ?string
    {
        $path = $this->settings['profile_picture_path'] ?? null;

        if ($path) {
            return route('client.connect.avatar', [
                'channel' => $this->channel_type,
                // Changes with the picture, so browsers never show a stale one.
                'v' => pathinfo($path, PATHINFO_FILENAME),
            ]);
        }

        return $this->settings['profile_picture_url'] ?? null;
    }

    /**
     * Restrict channels to those owned by the given tenant.
     */
    public function scopeForTenant(Builder $query, int|string|null $tenantId): Builder
    {
        return $query->where('tenant_id', (string) $tenantId);
    }
}
