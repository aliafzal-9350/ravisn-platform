<?php

return [

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Cloud API Version
    |--------------------------------------------------------------------------
    |
    | The version of the WhatsApp Cloud API to use for all requests.
    |
    */

    'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Graph API URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the Meta Graph API.
    |
    */

    'api_url' => env('WHATSAPP_API_URL', 'https://graph.facebook.com'),

    /*
    |--------------------------------------------------------------------------
    | Meta App Credentials
    |--------------------------------------------------------------------------
    |
    | Credentials for your Meta App and Master System User Access Token.
    |
    */

    'app_id' => env('WHATSAPP_APP_ID'),

    'app_secret' => env('WHATSAPP_APP_SECRET'),

    'config_id' => env('WHATSAPP_CONFIG_ID'),

    // Redirect URI used for Meta Embedded Signup (optional but recommended).
    // Example: https://app.ravisnapp.com/api/whatsapp/embedded-signup/callback
    'embedded_redirect_uri' => env('WHATSAPP_EMBEDDED_REDIRECT_URI', ''),

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Controls for message sending rate limits to comply with Meta's
    | WhatsApp Cloud API throughput limits.
    |
    */

    'rate_limit' => [
        'messages_per_second' => (int) env('WHATSAPP_RATE_LIMIT', 80),
        'batch_size' => (int) env('WHATSAPP_BATCH_SIZE', 50),
        'batch_delay_seconds' => (int) env('WHATSAPP_BATCH_DELAY', 2),
    ],

];
