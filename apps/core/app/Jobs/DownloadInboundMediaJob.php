<?php

namespace App\Jobs;

use App\Events\MessageMediaReadyEvent;
use App\Models\Message;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Copy a customer's image, voice note, video or document into our storage so
 * agents can see it in the inbox. Meta's links expire and (for WhatsApp)
 * need the channel's token, so the browser can never load them directly.
 */
class DownloadInboundMediaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** WhatsApp allows up to 100 MB; the inbox keeps files up to this size. */
    public const MAX_BYTES = 25 * 1024 * 1024;

    public int $tries = 3;

    public array $backoff = [10, 60, 300];

    public int $timeout = 120;

    protected const EXTENSIONS = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
        'audio/ogg' => 'ogg', 'audio/mpeg' => 'mp3', 'audio/mp4' => 'm4a', 'audio/aac' => 'aac', 'audio/amr' => 'amr',
        'video/mp4' => 'mp4', 'video/3gpp' => '3gp',
        'application/pdf' => 'pdf',
    ];

    public function __construct(
        public string $messageId
    ) {}

    public function handle(MetaGraphClient $meta): void
    {
        $message = Message::with('thread.channelIdentity')->find($this->messageId);

        if (! $message || $message->media_path || blank($message->media_url)) {
            return;
        }

        $channel = $message->thread?->channelIdentity;
        if (! $channel || blank($channel->access_token)) {
            Log::warning('[DownloadInboundMediaJob] No channel credentials for message '.$message->id);

            return;
        }

        $file = $meta->downloadMedia($message->media_url, $channel->access_token, self::MAX_BYTES);
        if ($file === null) {
            // Too large, gone or refused: the message stays text-only.
            return;
        }

        $mime = strtolower((string) ($file['mime'] ?: $message->media_mime_type ?: 'application/octet-stream'));
        $mimeBase = trim(explode(';', $mime)[0]);
        $extension = self::EXTENSIONS[$mimeBase] ?? 'bin';
        $tenantId = $channel->tenant_id ?? 'unassigned';
        $path = sprintf('inbound-media/%s/%s/%s.%s', $tenantId, now()->format('Y/m'), $message->id, $extension);

        Storage::disk((string) config('services.meta.media_disk', 'local'))->put($path, $file['body']);

        $message->update(['media_path' => $path, 'media_mime_type' => $mimeBase]);

        MessageMediaReadyEvent::dispatch(
            (string) $message->id,
            (string) $message->thread_id,
            (string) $message->mediaUrl(),
            $mimeBase,
            $tenantId === 'unassigned' ? null : (string) $tenantId,
        );
    }
}
