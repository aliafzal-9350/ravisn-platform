<?php

namespace App\Models;

use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'email', 'status', 'meta_business_id', 'webhook_token', 'ai_strategy'])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
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
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (empty($tenant->webhook_token)) {
                $tenant->webhook_token = bin2hex(random_bytes(32));
            }
        });
    }

    /**
     * Get the users for the tenant.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the WhatsApp accounts for the tenant.
     */
    public function whatsappAccounts(): HasMany
    {
        return $this->hasMany(WhatsappAccount::class);
    }

    /**
     * Get the message templates for the tenant.
     */
    public function messageTemplates(): HasMany
    {
        return $this->hasMany(MessageTemplate::class);
    }

    /**
     * Get the campaigns for the tenant.
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * Get the contacts for the tenant.
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * Get the contact groups for the tenant.
     */
    public function contactGroups(): HasMany
    {
        return $this->hasMany(ContactGroup::class);
    }

    /**
     * Get the API keys for the tenant.
     */
    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * Get the outgoing webhooks for the tenant.
     */
    public function outgoingWebhooks(): HasMany
    {
        return $this->hasMany(OutgoingWebhook::class);
    }

    /**
     * Get the automation flows for the tenant.
     */
    public function automationFlows(): HasMany
    {
        return $this->hasMany(AutomationFlow::class);
    }

    /**
     * Get the WhatsApp chats for the tenant.
     */
    public function whatsappChats(): HasMany
    {
        return $this->hasMany(WhatsappChat::class);
    }

    /**
     * Determine if the tenant is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
