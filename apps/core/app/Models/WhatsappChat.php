<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'whatsapp_account_id', 'customer_phone', 'customer_name', 'last_message_at', 'is_ai_active'])]
class WhatsappChat extends Model
{
    use HasFactory;

    /**
     * The data type of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';



    protected function casts(): array
    {
        return [
            'id' => 'string',
            'tenant_id' => 'string',
            'whatsapp_account_id' => 'string',
            'last_message_at' => 'datetime',
            'is_ai_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsappAccount::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsappMessage::class)->orderBy('created_at', 'asc');
    }
}
