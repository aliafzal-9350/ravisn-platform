<?php

namespace App\Models;

use Database\Factories\WhatsappAccountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'waba_id', 'app_id', 'app_secret', 'phone_number_id', 'phone_number',
    'display_name', 'status', 'quality_rating', 'verified_at', 'access_token',
    'messaging_limit_tier',
])]
class WhatsappAccount extends Model
{
    /** @use HasFactory<WhatsappAccountFactory> */
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
            'verified_at' => 'datetime',
        ];
    }

    /**
     * Get the tenant that owns the account.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the message templates for the account.
     */
    public function messageTemplates(): HasMany
    {
        return $this->hasMany(MessageTemplate::class);
    }

    /**
     * Get the chats for the account.
     */
    public function chats(): HasMany
    {
        return $this->hasMany(WhatsappChat::class);
    }

    /**
     * Get the campaigns for the account.
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * Determine if the account is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Determine if the account is verified.
     */
    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }
}
