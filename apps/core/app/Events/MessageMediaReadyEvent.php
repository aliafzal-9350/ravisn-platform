<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A customer's image, voice note or document has been copied into our storage
 * and can now be shown in the open conversation.
 */
class MessageMediaReadyEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $messageId,
        public string $threadId,
        public string $mediaUrl,
        public ?string $mimeType,
        public ?string $tenantId = null
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('chat.thread.'.$this->threadId)];

        if ($this->tenantId) {
            $channels[] = new PrivateChannel('tenant.'.$this->tenantId.'.inbox');
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'MessageMediaReady';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->messageId,
            'thread_id' => $this->threadId,
            'media_url' => $this->mediaUrl,
            'media_mime_type' => $this->mimeType,
        ];
    }
}
