<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'messages';

    protected $fillable = [
        'thread_id',
        'contact_id',
        'user_id',
        'direction',
        'channel_type',
        'external_message_id',
        'message_type',
        'content',
        'media_url',
        'media_mime_type',
        'media_path',
        'status',
        'is_ai_generated',
        'ai_model',
        'detected_intent',
        'prompt_tokens',
        'completion_tokens',
        'latency_ms',
        'confidence_score',
        'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'is_ai_generated' => 'boolean',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'latency_ms' => 'integer',
            'confidence_score' => 'float',
            'raw_payload' => 'array',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class, 'thread_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Where the browser loads this message's media.
     *
     * Customer media is served from our stored copy (DownloadInboundMediaJob);
     * outbound media we sent by public link keeps that link. A bare Meta media
     * id is not loadable by a browser, so it yields null until the copy exists.
     */
    public function mediaUrl(): ?string
    {
        if ($this->media_path) {
            return route('client.media.show', ['message' => $this->id]);
        }

        return is_string($this->media_url) && str_starts_with($this->media_url, 'https://')
            ? $this->media_url
            : null;
    }
}
