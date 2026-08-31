<?php

namespace App\Http\Middleware;

use App\Services\Meta\MetaSignatureValidator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyMetaWebhookSignature
{
    public function __construct(
        protected MetaSignatureValidator $validator
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production')) {
            $signature = $request->header('X-Hub-Signature-256');
            $rawPayload = $request->getContent();

            if (! $this->validator->isValid($rawPayload, $signature)) {
                return response()->json(['error' => 'Invalid webhook signature'], 401);
            }
        }

        return $next($request);
    }
}
