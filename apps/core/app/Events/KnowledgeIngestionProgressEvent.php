<?php

namespace App\Events;

use App\Models\KnowledgeIngestionJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class KnowledgeIngestionProgressEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public KnowledgeIngestionJob $ingestionJob
    ) {}

    /**
     * The channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('knowledge.ingestion.'.$this->ingestionJob->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'KnowledgeIngestionProgress';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'job_id' => (string) $this->ingestionJob->id,
            'status' => $this->ingestionJob->status,
            'chunks_indexed' => $this->ingestionJob->chunks_indexed,
            'char_count' => $this->ingestionJob->char_count,
            'error_message' => $this->ingestionJob->error_message,
        ];
    }
}
