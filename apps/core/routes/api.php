<?php

use App\Http\Controllers\Api\MessageApiController;
use App\Http\Controllers\Webhooks\MetaWebhookController;
use Illuminate\Support\Facades\Route;

// 1. Meta Omnichannel Inbound Webhook Endpoint
Route::prefix('v1/webhooks/meta')->group(function () {
    Route::get('/', [MetaWebhookController::class, 'verify'])->name('webhooks.meta.verify');
    Route::post('/', [MetaWebhookController::class, 'handle'])->name('webhooks.meta.handle');
});

// Fallback alias for /api/webhook/meta
Route::prefix('webhook/meta')->group(function () {
    Route::get('/', [MetaWebhookController::class, 'verify']);
    Route::post('/', [MetaWebhookController::class, 'handle']);
});

// 2. Core CRM Developer & Message APIs
Route::middleware(['auth.api'])
    ->prefix('v1')
    ->group(function () {
        Route::post('messages/send-text', [MessageApiController::class, 'sendText']);
        Route::post('messages/send-template', [MessageApiController::class, 'sendTemplate']);
    });
