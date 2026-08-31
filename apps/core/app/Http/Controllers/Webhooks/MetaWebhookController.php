<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\PushInboundToAiJob;
use App\Services\Meta\MetaSignatureValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class MetaWebhookController extends Controller
{
    public function __construct(
        protected MetaSignatureValidator $validator
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

        Log::warning('[MetaWebhookController] Verification Handshake Failed', [
            'mode' => $mode,
            'token' => $token,
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

        // In production, signature validation is mandatory
        if (app()->environment('production') && ! $this->validator->isValid($rawPayload, $signature)) {
            Log::warning('[MetaWebhookController] Invalid Signature Rejected', [
                'signature' => $signature,
            ]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = $request->json()->all();

        // Dispatch background processing immediately
        PushInboundToAiJob::dispatch($payload);

        // Immediate acknowledgment required by Meta
        return response()->json(['status' => 'EVENT_RECEIVED'], 200);
    }
}
