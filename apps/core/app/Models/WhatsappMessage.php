<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['whatsapp_chat_id', 'direction', 'message_type', 'body', 'meta_message_id', 'status', 'sent_at'])]
class WhatsappMessage extends Model
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
            'whatsapp_chat_id' => 'string',
            'sent_at' => 'datetime',
        ];
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(WhatsappChat::class, 'whatsapp_chat_id');
    }
}
