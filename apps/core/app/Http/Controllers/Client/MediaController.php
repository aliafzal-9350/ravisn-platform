<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Types the browser may show inline. Anything else (a customer can send any
     * "document") is downloaded, never rendered on our origin.
     */
    protected const INLINE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

    /**
     * Serve a customer's media file to agents of the workspace that owns it.
     */
    public function show(Request $request, string $message): StreamedResponse
    {
        abort_unless(Str::isUuid($message), 404);

        $tenantId = $request->user()?->tenant_id;
        abort_if($tenantId === null, 403);

        $record = Message::whereIn('thread_id', Thread::forTenant($tenantId)->select('threads.id'))
            ->whereNotNull('media_path')
            ->findOrFail($message);

        $disk = Storage::disk((string) config('services.meta.media_disk', 'local'));
        abort_unless($disk->exists($record->media_path), 404);

        $mime = (string) ($record->media_mime_type ?: 'application/octet-stream');
        $inline = in_array($mime, self::INLINE_TYPES, true) || str_starts_with($mime, 'audio/') || str_starts_with($mime, 'video/');

        $headers = [
            'Content-Type' => $inline ? $mime : 'application/octet-stream',
            'Cache-Control' => 'private, max-age=86400',
        ];

        // Even if a file is opened directly, it cannot run scripts on our
        // origin. (Browsers refuse to show PDFs under a sandbox policy; they
        // render them in their own isolated viewer instead.)
        if ($mime !== 'application/pdf') {
            $headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox";
        }

        return $disk->response($record->media_path, basename($record->media_path), $headers, $inline ? 'inline' : 'attachment');
    }
}
