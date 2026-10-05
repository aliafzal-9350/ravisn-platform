<?php

namespace App\Jobs;

use App\Services\WhatsApp\WebhookHandler;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Account bookkeeping for one WhatsApp webhook event: delivery receipts and
 * campaign counters, phone quality alerts, the WhatsApp chat log, automation
 * triggers and the tenant's outgoing webhooks.
 *
 * Runs on the queue so the webhook can acknowledge Meta immediately. AI replies
 * are not handled here; PushInboundToAiJob routes the message to the tenant's
 * own agent.
 */
class ProcessWhatsAppWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public array $payload
    ) {
        $this->onQueue('webhooks');
    }

    public function handle(WebhookHandler $handler): void
    {
        $handler->handle($this->payload);
    }
}
