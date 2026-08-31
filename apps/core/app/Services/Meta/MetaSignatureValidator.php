<?php

namespace App\Services\Meta;

use Illuminate\Support\Facades\Log;

class MetaSignatureValidator
{
    /**
     * Validate HMAC-SHA256 signature from X-Hub-Signature-256 header.
     */
    public function isValid(string $rawPayload, ?string $signatureHeader, ?string $appSecret = null): bool
    {
        if (empty($signatureHeader)) {
            return false;
        }

        $secret = $appSecret ?: config('services.meta.app_secret', env('META_APP_SECRET', ''));
        if (empty($secret)) {
            Log::warning('[MetaSignatureValidator] META_APP_SECRET is not configured.');
            return false;
        }

        // Expected format: sha256={hash}
        $parts = explode('=', $signatureHeader, 2);
        if (count($parts) !== 2 || strtolower($parts[0]) !== 'sha256') {
            return false;
        }

        $expectedHash = hash_hmac('sha256', $rawPayload, $secret);
        return hash_equals($expectedHash, $parts[1]);
    }
}
