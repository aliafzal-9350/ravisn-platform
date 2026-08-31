<?php

namespace App\Jobs;

use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCampaign implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Campaign $campaign,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if ($this->campaign->status === 'paused') {
            Log::info("Campaign {$this->campaign->id} is paused, skipping");

            return;
        }

        $this->campaign->update([
            'status' => 'processing',
            'started_at' => $this->campaign->started_at ?? now(),
        ]);

        $batchSize = config('whatsapp.rate_limit.batch_size', 50);
        $batchDelay = config('whatsapp.rate_limit.batch_delay_seconds', 2);

        $pendingRecipients = $this->campaign->recipients()
            ->where('status', 'pending')
            ->get();

        if ($pendingRecipients->isEmpty()) {
            $this->campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            return;
        }

        $batches = $pendingRecipients->chunk($batchSize);

        foreach ($batches as $batchIndex => $batch) {
            foreach ($batch as $recipient) {
                SendCampaignMessage::dispatch($this->campaign, $recipient)
                    ->delay(now()->addSeconds($batchIndex * $batchDelay));
            }
        }

        Log::info("Campaign {$this->campaign->id} dispatched", [
            'total_recipients' => $pendingRecipients->count(),
            'batches' => $batches->count(),
        ]);
    }
}
