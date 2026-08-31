<?php

namespace App\Models;

use Database\Factories\CampaignFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'whatsapp_account_id', 'message_template_id', 'name',
    'message_type', 'direct_message_body', 'header_media_url', 'parameters', 'status', 'total_recipients',
    'sent_count', 'delivered_count', 'failed_count', 'read_count',
    'total_cost', 'scheduled_at', 'scheduled_timezone', 'started_at', 'completed_at',
])]
class Campaign extends Model
{
    /** @use HasFactory<CampaignFactory> */
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
            'whatsapp_account_id' => 'string',
            'message_template_id' => 'string',
            'parameters' => 'array',
            'total_cost' => 'decimal:4',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Get the tenant that owns the campaign.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the WhatsApp account for the campaign.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsappAccount::class);
    }

    /**
     * Get the message template for the campaign.
     */
    public function messageTemplate(): BelongsTo
    {
        return $this->belongsTo(MessageTemplate::class);
    }

    /**
     * Get the recipients for the campaign.
     */
    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    /**
     * Calculate the progress percentage.
     */
    public function progressPercentage(): float
    {
        if ($this->total_recipients === 0) {
            return 0;
        }

        return round(($this->sent_count + $this->failed_count) / $this->total_recipients * 100, 1);
    }

    /**
     * Determine if all campaign recipients have been processed.
     */
    public function hasProcessedAllRecipients(): bool
    {
        if ($this->total_recipients === 0) {
            return true;
        }

        return ! $this->recipients()
            ->where('status', 'pending')
            ->exists();
    }
}
