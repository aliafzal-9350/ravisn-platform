<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageCreatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message|array $message,
        public ?string $threadId = null
    ) {
        if ($message instanceof Message) {
            $this->threadId = (string) $message->thread_id;
        } elseif (is_array($message)) {
            $this->threadId = $this->threadId ?? ($message['thread_id'] ?? null);
        }
    }

    /**
     * The channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        if ($this->threadId) {
            $channels[] = new PrivateChannel('chat.thread.'.$this->threadId);
        }

        $tenantId = null;
        if ($this->message instanceof Message) {
            $tenantId = $this->message->thread?->tenantId() ?? $this->message->contact?->tenant_id;
        } elseif (is_array($this->message)) {
            $tenantId = $this->message['tenant_id'] ?? null;
        }

        if ($tenantId) {
            $channels[] = new PrivateChannel('tenant.'.$tenantId.'.inbox');
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'MessageCreated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        if ($this->message instanceof Message) {
            $rawPayload = $this->message->raw_payload;
            $whisperTranscript = is_array($rawPayload)
                ? ($rawPayload['transcript'] ?? $rawPayload['whisper_transcript'] ?? null)
                : null;
            if (! $whisperTranscript && in_array($this->message->message_type, ['audio', 'voice'])) {
                $whisperTranscript = $this->message->content;
            }

            $telemetry = is_array($rawPayload) ? ($rawPayload['telemetry'] ?? null) : null;
            $citedChunk = is_array($telemetry) ? ($telemetry['cited_chunk'] ?? null) : null;

            return [
                'event' => 'MessageCreated',
                'thread_id' => (string) $this->message->thread_id,
                'message' => [
                    'id' => (string) $this->message->id,
                    'thread_id' => (string) $this->message->thread_id,
                    'contact_id' => (string) $this->message->contact_id,
                    'direction' => $this->message->direction,
                    'channel_type' => $this->message->channel_type,
                    'message_type' => $this->message->message_type ?? 'text',
                    'content' => $this->message->content,
                    'media_url' => $this->message->media_url,
                    'media_mime_type' => $this->message->media_mime_type,
                    'whisper_transcript' => $whisperTranscript,
                    'is_ai_generated' => (bool) $this->message->is_ai_generated,
                    'ai_model' => $this->message->ai_model,
                    'detected_intent' => $this->message->detected_intent,
                    'latency_ms' => $this->message->latency_ms,
                    'prompt_tokens' => $this->message->prompt_tokens,
                    'completion_tokens' => $this->message->completion_tokens,
                    'confidence_score' => $this->message->confidence_score,
                    'telemetry' => $telemetry,
                    'rag_chunk' => $citedChunk,
                    'status' => $this->message->status,
                    'created_at' => $this->message->created_at?->toISOString() ?? now()->toISOString(),
                ],
            ];
        }

        return [
            'event' => 'MessageCreated',
            'thread_id' => $this->threadId,
            'message' => $this->message,
        ];
    }
}
