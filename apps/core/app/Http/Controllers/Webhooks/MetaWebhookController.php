<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\PushInboundToAiJob;
use App\Services\Meta\MetaSignatureValidator;
use App\Services\Meta\WebhookEventDeduplicator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class MetaWebhookController extends Controller
{
    public function __construct(
        protected MetaSignatureValidator $validator,
        protected WebhookEventDeduplicator $deduplicator
    ) {}

    /**
     * Meta Webhook Verification Handshake (hub.challenge)
     */
    public function verify(Request $request): Response
    {
        $mode = $request->query('hub_mode') ?: $request->query('hub.mode');
        $token = $request->query('hub_verify_token') ?: $request->query('hub.verify_token');
        $challenge = $request->query('hub_challenge') ?: $request->query('hub.challenge');
        $expectedToken = config('services.meta.webhook_verify_token', env('META_WEBHOOK_VERIFY_TOKEN'));

        if ($mode === 'subscribe' && $token === $expectedToken) {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        // Never log the submitted token: a near-miss would leak the real one.
        Log::warning('[MetaWebhookController] Verification Handshake Failed', [
            'mode' => $mode,
        ]);

        return response('Forbidden', 403);
    }

    /**
     * Meta Webhook Event Ingestion (Instant ACK < 150ms)
     */
    public function handle(Request $request): JsonResponse
    {
        $signature = $request->header('X-Hub-Signature-256');
        $rawPayload = $request->getContent();

        $appSecret = config('services.meta.app_secret');

        // Whenever an app secret is configured, every delivery must carry a valid
        // signature, in every environment. Unsigned traffic is only tolerated in
        // local development with no secret set, and never in production.
        if (filled($appSecret)) {
            if (! $this->validator->isValid($rawPayload, $signature, $appSecret)) {
                Log::warning('[MetaWebhookController] Invalid or missing signature rejected', [
                    'has_signature' => filled($signature),
                ]);

                return response()->json(['error' => 'Invalid signature'], 401);
            }
        } elseif (app()->environment('production')) {
            Log::error('[MetaWebhookController] META_APP_SECRET is not configured; refusing unverifiable webhook.');

            return response()->json(['error' => 'Webhook signature verification is not configured'], 401);
        }

        $payload = $request->json()->all();

        // Split the delivery into single events and drop Meta retries atomically,
        // before any AI inference is queued.
        $events = $this->deduplicator->newEvents($payload);

        if (empty($events)) {
            return response()->json(['status' => 'EVENT_RECEIVED', 'duplicate' => true], 200);
        }

        // Dispatch background processing immediately
        foreach ($events as $event) {
            PushInboundToAiJob::dispatch($event['payload'], $event['redis_key']);
        }

        // Immediate acknowledgment required by Meta
        return response()->json(['status' => 'EVENT_RECEIVED'], 200);
    }
}
