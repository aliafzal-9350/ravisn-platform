<?php

namespace App\Jobs;

use App\Models\OutgoingWebhook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendOutgoingWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    protected OutgoingWebhook $webhook;

    protected array $payload;

    /**
     * Create a new job instance.
     */
    public function __construct(OutgoingWebhook $webhook, array $payload)
    {
        $this->webhook = $webhook;
        $this->payload = $payload;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $jsonPayload = json_encode($this->payload);
        $signature = 'sha256='.hash_hmac('sha256', $jsonPayload, $this->webhook->secret_token);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Hub-Signature-256' => $signature,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($this->webhook->url, $this->payload);

            if (! $response->successful()) {
                Log::warning("Outgoing webhook to {$this->webhook->url} returned status {$response->status()}", [
                    'response' => $response->body(),
                ]);
                throw new \Exception('Webhook failed with status '.$response->status());
            }
        } catch (\Exception $e) {
            Log::error("Failed to dispatch outgoing webhook to {$this->webhook->url}: ".$e->getMessage());
            throw $e; // Re-throw to trigger retry
        }
    }
}
