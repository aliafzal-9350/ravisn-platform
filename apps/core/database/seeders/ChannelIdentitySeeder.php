<?php

namespace Database\Seeders;

use App\Models\ChannelIdentity;
use Illuminate\Database\Seeder;

class ChannelIdentitySeeder extends Seeder
{
    /**
     * Seed default channel identities for WhatsApp, Messenger, and Instagram.
     */
    public function run(): void
    {
        // 1. Primary WhatsApp Cloud API Channel
        ChannelIdentity::updateOrCreate(
            ['external_id' => env('WHATSAPP_PHONE_NUMBER_ID', '100609346426745')],
            [
                'channel_type' => 'whatsapp',
                'account_name' => 'Primary WhatsApp Business',
                'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID', '100609346426700'),
                'access_token' => env('WHATSAPP_SYSTEM_USER_ACCESS_TOKEN', 'EAAG...sandbox_token'),
                'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN', 'ravisn-dev-verify-token'),
                'is_active' => true,
                'settings' => [
                    'auto_reply' => true,
                    'bot_active' => true,
                    'default_language' => 'en_US',
                ],
            ]
        );

        // 2. Facebook Messenger Page Channel
        ChannelIdentity::updateOrCreate(
            ['external_id' => '109283748291039'],
            [
                'channel_type' => 'messenger',
                'account_name' => 'RAVISN Facebook Page',
                'business_account_id' => '100609346426700',
                'access_token' => env('FACEBOOK_PAGE_ACCESS_TOKEN', 'EAAG...messenger_token'),
                'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN', 'ravisn-dev-verify-token'),
                'is_active' => true,
                'settings' => [
                    'auto_reply' => true,
                    'bot_active' => true,
                ],
            ]
        );

        // 3. Instagram Direct Message Channel
        ChannelIdentity::updateOrCreate(
            ['external_id' => 'instagram_account_17841400123456789'],
            [
                'channel_type' => 'instagram',
                'account_name' => 'RAVISN Official Instagram',
                'business_account_id' => '100609346426700',
                'access_token' => env('INSTAGRAM_ACCESS_TOKEN', 'EAAG...instagram_token'),
                'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN', 'ravisn-dev-verify-token'),
                'is_active' => true,
                'settings' => [
                    'auto_reply' => true,
                    'bot_active' => true,
                ],
            ]
        );
    }
}
