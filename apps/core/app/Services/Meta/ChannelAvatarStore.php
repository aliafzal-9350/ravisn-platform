<?php

namespace App\Services\Meta;

use App\Models\ChannelIdentity;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Keeps our own copy of each channel's profile picture.
 *
 * Meta returns profile pictures as signed CDN links that expire after a few
 * days, so storing the link would leave broken images behind. The picture is
 * downloaded once and served from our storage instead.
 */
class ChannelAvatarStore
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    /**
     * Only Meta's own image hosts are fetched, so a crafted URL cannot make the
     * server request internal addresses.
     */
    protected const ALLOWED_HOSTS = '/(^|\.)(fbcdn\.net|fbsbx\.com|facebook\.com|whatsapp\.net|cdninstagram\.com)$/i';

    protected const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /**
     * Download the picture and record it on the channel. A failed download
     * keeps whatever avatar the channel already had.
     */
    public function attach(ChannelIdentity $channel, ?string $remoteUrl): void
    {
        $path = $this->download($channel, $remoteUrl);
        if ($path === null) {
            return;
        }

        $settings = $channel->settings ?? [];
        $previous = $settings['profile_picture_path'] ?? null;
        $settings['profile_picture_path'] = $path;
        unset($settings['profile_picture_url']);

        $channel->forceFill(['settings' => $settings])->save();

        if ($previous && $previous !== $path) {
            Storage::disk($this->disk())->delete($previous);
        }
    }

    public function disk(): string
    {
        return (string) config('services.meta.media_disk', 'local');
    }

    protected function download(ChannelIdentity $channel, ?string $remoteUrl): ?string
    {
        if (! $remoteUrl || ! str_starts_with($remoteUrl, 'https://')
            || ! preg_match(self::ALLOWED_HOSTS, (string) parse_url($remoteUrl, PHP_URL_HOST))) {
            return null;
        }

        try {
            $response = Http::timeout(10)->get($remoteUrl);
        } catch (\Throwable $e) {
            Log::warning('[ChannelAvatarStore] Profile picture download failed: '.$e->getMessage());

            return null;
        }

        $contentType = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));
        $extension = self::EXTENSIONS[$contentType] ?? null;
        $body = $response->body();

        if (! $response->successful() || $extension === null || $body === '' || strlen($body) > self::MAX_BYTES) {
            return null;
        }

        $path = sprintf('channel-avatars/%s/%s-%s.%s', $channel->tenant_id, $channel->channel_type, substr(sha1($body), 0, 16), $extension);
        Storage::disk($this->disk())->put($path, $body);

        return $path;
    }
}
