<?php

namespace App\Models;

use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'email', 'status', 'meta_business_id', 'webhook_token', 'ai_strategy', 'settings'])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory;



    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
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

    /**
     * Whether the AI may answer customers at all. "Pure manual" (set on the
     * Automations page) is the workspace-wide off switch: humans reply to
     * everything.
     */
    public function aiRepliesEnabled(): bool
    {
        return $this->ai_strategy !== 'pure_manual';
    }

    /**
     * The Prompt Tuning settings sent with every AI task, so the agent answers
     * in this tenant's own voice.
     *
     * @return array<string, mixed>
     */
    public function aiConfig(): array
    {
        $settings = $this->settings ?? [];

        return array_filter([
            'system_prompt' => $settings['system_prompt'] ?? null,
            'ai_tone' => $settings['ai_tone'] ?? null,
            'prohibited_topics' => $settings['prohibited_topics'] ?? null,
            'temperature' => $settings['temperature'] ?? null,
            'company_name' => $this->name,
        ], fn ($value) => $value !== null && $value !== '');
    }
}
