<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'facebook' => [
        'app_id' => env('FACEBOOK_APP_ID', env('META_APP_ID')),
        'app_secret' => env('FACEBOOK_APP_SECRET', env('META_APP_SECRET')),
    ],

    'meta' => [
        'app_id' => env('META_APP_ID'),
        'app_secret' => env('META_APP_SECRET'),
        'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN', env('WHATSAPP_WEBHOOK_VERIFY_TOKEN')),
        'api_version' => env('META_API_VERSION', 'v21.0'),
        'whatsapp_phone_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'whatsapp_waba_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        'whatsapp_system_token' => env('WHATSAPP_SYSTEM_USER_ACCESS_TOKEN', env('META_ACCESS_TOKEN')),
        'inbound_ai_stream_key' => env('INBOUND_AI_STREAM_KEY', 'inbound_ai_jobs'),
        'crm_broadcast_channel' => env('CRM_BROADCAST_CHANNEL', 'crm_channel_updates'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL') . '/auth/google/callback'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    // Internal FastAPI agent. Only Laravel calls it, authenticated with the
    // shared token (the agent's INTERNAL_API_TOKEN).
    'agent' => [
        'url' => env('AGENT_API_URL', 'http://agent:8000'),
        'internal_token' => env('AGENT_INTERNAL_TOKEN'),
    ],

    'whatsapp' => [
        'app_id' => env('WHATSAPP_APP_ID', env('META_APP_ID')),
        'app_secret' => env('WHATSAPP_APP_SECRET', env('META_APP_SECRET')),
        'config_id' => env('WHATSAPP_CONFIG_ID'),
    ],

];
