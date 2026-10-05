<?php

namespace App\Events;

use App\Models\Thread;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ThreadUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Thread|array $thread,
        public ?string $threadId = null
    ) {
        if ($thread instanceof Thread) {
            $this->threadId = (string) $thread->id;
        } elseif (is_array($thread)) {
            $this->threadId = $this->threadId ?? ($thread['id'] ?? null);
        }
    }

    /**
     * The channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        if ($this->threadId) {
            $channels[] = new PrivateChannel('chat.thread.' . $this->threadId);
        }

        $tenantId = $this->thread instanceof Thread
            ? $this->thread->tenantId()
            : ($this->thread['tenant_id'] ?? null);

        if ($tenantId) {
            $channels[] = new PrivateChannel('tenant.' . $tenantId . '.inbox');
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'ThreadUpdated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        if ($this->thread instanceof Thread) {
            return [
                'event' => 'ThreadUpdated',
                'thread_id' => (string) $this->thread->id,
                'thread' => [
                    'id' => (string) $this->thread->id,
                    'contact_id' => (string) $this->thread->contact_id,
                    'channel_type' => $this->thread->channel_type,
                    'status' => $this->thread->status,
                    'bot_active' => (bool) $this->thread->bot_active,
                    'last_message_at' => $this->thread->last_message_at?->toISOString() ?? now()->toISOString(),
                ],
            ];
        }

        return [
            'event' => 'ThreadUpdated',
            'thread_id' => $this->threadId,
            'thread' => $this->thread,
        ];
    }
}
