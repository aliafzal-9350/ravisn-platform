<?php

use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ContactController;
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

// 2. Production Omnichannel Inbox APIs
Route::prefix('v1/inbox')->group(function () {
    Route::get('/', [ChatController::class, 'index'])->name('api.inbox.index');
    Route::get('/threads/{id}', [ChatController::class, 'showThread'])->name('api.inbox.threads.show');
    Route::post('/threads/{id}/messages', [ChatController::class, 'sendMessage'])->name('api.inbox.threads.send-message');
});

// 3. Customer CRM Contact Update API
Route::prefix('v1/contacts')->group(function () {
    Route::put('/{id}', [ContactController::class, 'update'])->name('api.contacts.update');
    Route::patch('/{id}', [ContactController::class, 'update']);
    Route::post('/{id}', [ContactController::class, 'update']);
});

// 4. Chat, Threads & Human Takeover APIs (Backward Compatibility)
Route::prefix('v1/threads')->group(function () {
    Route::get('/', [ChatController::class, 'index'])->name('api.threads.index');
    Route::get('/{id}', [ChatController::class, 'showThread']);
    Route::get('/{id}/messages', [ChatController::class, 'messages'])->name('api.threads.messages');
    Route::post('/{id}/messages', [ChatController::class, 'sendMessage'])->name('api.threads.send-message');
    Route::patch('/{id}/toggle-bot', [ChatController::class, 'toggleBot'])->name('api.threads.toggle-bot');
    Route::post('/{id}/toggle-bot', [ChatController::class, 'toggleBot']);
});

// 5. Channels Management APIs
Route::prefix('v1/channels')->group(function () {
    Route::post('sync', [\App\Http\Controllers\Client\ChannelController::class, 'sync'])->name('api.channels.sync');
    Route::post('manual-link/whatsapp', [\App\Http\Controllers\Client\ChannelController::class, 'manualLinkWhatsApp'])->name('api.channels.manual-link.whatsapp');
    Route::post('{channel}/test-ping', [\App\Http\Controllers\Client\ChannelController::class, 'testPing'])->name('api.channels.test-ping');
    Route::delete('{id}', [\App\Http\Controllers\Client\ChannelController::class, 'disconnect'])->name('api.channels.disconnect');
});

// 6. Core CRM Developer & Message APIs
Route::middleware(['auth.api'])
    ->prefix('v1')
    ->group(function () {
        Route::post('messages/send-text', [MessageApiController::class, 'sendText']);
        Route::post('messages/send-template', [MessageApiController::class, 'sendTemplate']);
    });
