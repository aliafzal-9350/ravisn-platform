<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessWhatsAppWebhookEvent;
use App\Jobs\PushInboundToAiJob;
use App\Services\Meta\WebhookEventDeduplicator;
use App\Services\WhatsApp\WebhookHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * Verify the webhook subscription (GET request from Meta).
     */
    public function verify(Request $request, WebhookHandler $handler, ?string $tenant_token = null): Response
    {
        $result = $handler->verifySubscription($request, $tenant_token);

        if ($result['verified']) {
            return response($result['challenge'], 200);
        }

        return response('Forbidden', 403);
    }

    /**
     * Handle incoming webhook events (POST request from Meta).
     *
     * Only verifies, deduplicates and queues: Meta needs an answer within a few
     * seconds, so no database-heavy work or AI inference happens in this request.
     */
    public function handle(Request $request, WebhookHandler $handler, ?string $tenant_token = null): JsonResponse
    {
        if (! $handler->isValidSignature($request, $tenant_token)) {
            Log::warning('WhatsApp Webhook signature verification failed', [
                'has_tenant_token' => $tenant_token !== null,
            ]);

            return response()->json(['error' => 'Invalid signature'], 403);
        }

        // Split the delivery into single events and drop Meta retries atomically.
        $events = app(WebhookEventDeduplicator::class)->newEvents($request->all());

        if (empty($events)) {
            return response()->json(['status' => 'ok', 'duplicate' => true], 200);
        }

        foreach ($events as $event) {
            ProcessWhatsAppWebhookEvent::dispatch($event['payload']);

            // Customer messages also go to the omnichannel pipeline: it creates
            // the inbox thread and queues a reply from the tenant's own agent
            // (their knowledge base and Prompt Tuning, never a shared persona).
            if (! empty(data_get($event['payload'], 'entry.0.changes.0.value.messages'))) {
                PushInboundToAiJob::dispatch($event['payload'], $event['redis_key']);
            }
        }

        return response()->json(['status' => 'ok']);
    }
}
