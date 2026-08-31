<?php

namespace App\Console\Commands;

use App\Models\ChannelIdentity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncMetaTemplatesCommand extends Command
{
    protected $signature = 'meta:sync-templates';
    protected $description = 'Sync approved WhatsApp message templates from Meta Graph API';

    public function handle(): int
    {
        $this->info('Starting Meta WhatsApp Template Synchronization...');

        $channels = ChannelIdentity::where('channel_type', 'whatsapp')->where('is_active', true)->get();

        foreach ($channels as $channel) {
            $wabaId = $channel->business_account_id ?: config('services.meta.whatsapp_waba_id');
            if (! $wabaId) {
                $this->warn("Skipping channel {$channel->account_name}: No WABA ID found.");
                continue;
            }

            $apiVersion = config('services.meta.api_version', 'v21.0');
            $url = "https://graph.facebook.com/{$apiVersion}/{$wabaId}/message_templates";

            try {
                $response = Http::withToken($channel->access_token)->get($url, [
                    'limit' => 100,
                ]);

                if ($response->successful()) {
                    $templates = $response->json('data', []);
                    $this->info("Synced " . count($templates) . " templates for {$channel->account_name}");
                } else {
                    $this->error("Failed to sync templates for {$channel->account_name}: " . $response->body());
                }
            } catch (\Throwable $e) {
                $this->error("Error syncing templates: " . $e->getMessage());
                Log::error('[SyncMetaTemplatesCommand] Error: ' . $e->getMessage());
            }
        }

        $this->info('Meta Template Sync completed.');
        return Command::SUCCESS;
    }
}
