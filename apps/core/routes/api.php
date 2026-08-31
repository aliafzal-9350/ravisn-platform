<?php

use App\Http\Controllers\Api\MessageApiController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth.api'])
    ->prefix('v1')
    ->group(function () {
        Route::post('messages/send-text', [MessageApiController::class, 'sendText']);
        Route::post('messages/send-template', [MessageApiController::class, 'sendTemplate']);
    });
