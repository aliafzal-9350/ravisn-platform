<?php

namespace App\Services\Meta;

/**
 * Hosts Meta serves files from (profile pictures, customer media). Anything
 * we download on Meta's behalf must come from one of these, so a crafted URL
 * can never make the server fetch an internal address.
 */
class MetaCdn
{
    protected const HOSTS = '/(^|\.)(fbcdn\.net|fbsbx\.com|facebook\.com|whatsapp\.net|cdninstagram\.com)$/i';

    public static function allows(?string $url): bool
    {
        return is_string($url)
            && str_starts_with($url, 'https://')
            && preg_match(self::HOSTS, (string) parse_url($url, PHP_URL_HOST)) === 1;
    }
}
