<?php

namespace App\Console\Commands;

use App\Jobs\ProcessCampaign;
use App\Models\Campaign;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('campaigns:dispatch-scheduled')]
#[Description('Dispatch campaigns whose scheduled time has arrived.')]
class DispatchScheduledCampaigns extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dispatched = 0;

        Campaign::query()
            ->where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->eachById(function (Campaign $campaign) use (&$dispatched): void {
                $updated = Campaign::query()
                    ->whereKey($campaign->id)
                    ->where('status', 'scheduled')
                    ->update([
                        'status' => 'processing',
                        'started_at' => now(),
                    ]);

                if ($updated !== 1) {
                    return;
                }

                ProcessCampaign::dispatch($campaign->fresh());
                $dispatched++;
            });

        $this->info("Dispatched {$dispatched} scheduled campaign(s).");

        return self::SUCCESS;
    }
}
