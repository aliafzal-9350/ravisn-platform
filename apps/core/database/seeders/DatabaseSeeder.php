<?php

namespace Database\Seeders;

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Workspace / Tenant
        $tenant = Tenant::updateOrCreate(
            ['email' => 'admin@ravisn.com'],
            [
                'name' => 'RAVISN Platform',
                'status' => 'active',
                'meta_business_id' => '10928374829103',
            ]
        );

        // 2. Create Default Workspace Owner User (Ali Afzal)
        $user = User::updateOrCreate(
            ['email' => 'admin@ravisn.com'],
            [
                'name' => 'Ali Afzal',
                'password' => Hash::make('password'),
                'role' => 'client',
                'tenant_id' => $tenant->id,
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'client@zeromsg.com'],
            [
                'name' => 'Client User',
                'password' => Hash::make('password'),
                'role' => 'client',
                'tenant_id' => $tenant->id,
                'email_verified_at' => now(),
            ]
        );

        // 3. Create Default Channel Identities
        $waChannel = ChannelIdentity::firstOrCreate(
            ['channel_type' => 'whatsapp'],
            [
                'account_name' => 'Official WhatsApp Business Cloud',
                'external_id' => '10928374829103',
                'business_account_id' => '10928374829103',
                'access_token' => 'EAAG_sandbox_token_ravisn',
                'webhook_verify_token' => 'ravisn_verify_secret_token_123',
                'is_active' => true,
            ]
        );

        $igChannel = ChannelIdentity::firstOrCreate(
            ['channel_type' => 'instagram'],
            [
                'account_name' => 'Instagram Direct',
                'external_id' => '17841400000000000',
                'business_account_id' => '10928374829103',
                'access_token' => 'EAAG_sandbox_token_ravisn_ig',
                'webhook_verify_token' => 'ravisn_verify_secret_token_123',
                'is_active' => true,
            ]
        );

        $msgChannel = ChannelIdentity::firstOrCreate(
            ['channel_type' => 'messenger'],
            [
                'account_name' => 'Facebook Messenger',
                'external_id' => '100000000000000',
                'business_account_id' => '10928374829103',
                'access_token' => 'EAAG_sandbox_token_ravisn_msg',
                'webhook_verify_token' => 'ravisn_verify_secret_token_123',
                'is_active' => true,
            ]
        );
        // 4. Seed Company Knowledge Base
        $this->call(KnowledgeBaseSeeder::class);

        // 5. Seed Omnichannel Inbox Threads & Conversations
        $this->call(OmnichannelInboxSeeder::class);
    }
}
