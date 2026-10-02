<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
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
     */
    public function handle(Request $request, WebhookHandler $handler, ?string $tenant_token = null): JsonResponse
    {

        if (! $handler->isValidSignature($request, $tenant_token)) {
            Log::warning('WhatsApp Webhook signature verification failed', [
                'tenant_token' => $tenant_token,
                'signature_header' => $request->header('X-Hub-Signature-256'),
            ]);

            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $payload = $request->all();
        \Illuminate\Support\Facades\Log::info('WhatsApp Incoming Webhook:', $payload);

        // Split the delivery into single events and drop Meta retries atomically.
        $events = app(WebhookEventDeduplicator::class)->newEvents($payload);

        if (empty($events)) {
            return response()->json(['status' => 'ok', 'duplicate' => true], 200);
        }

        foreach ($events as $event) {
            $handler->handle($event['payload']);
        }

        return response()->json(['status' => 'ok']);
    }
}
