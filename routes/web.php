<?php

use App\Http\Controllers\Telegram\WebhookController as TelegramBotWebhookController;
use App\Http\Controllers\Webhook\OxaPayWebhookController;
use App\Http\Controllers\Web\BrowserPollController;
use App\Http\Controllers\Web\TelegramWebAuthController;
use App\Http\Controllers\Web\TelegramWidgetAuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::post('/admin/broadcasting/auth', function (Request $request) {
    $socketId    = $request->input('socket_id', '');
    $channelName = $request->input('channel_name', '');

    if (! str_starts_with($channelName, 'private-chats.')) {
        abort(403);
    }

    $key    = config('broadcasting.connections.reverb.key');
    $secret = config('broadcasting.connections.reverb.secret');
    $sig    = hash_hmac('sha256', $socketId . ':' . $channelName, $secret);

    return response()->json(['auth' => $key . ':' . $sig]);
})->middleware(['web', 'auth:admin']);

Route::post('/auth/telegram', [TelegramWebAuthController::class, 'handle'])
    ->name('web.auth.telegram');

Route::post('/auth/telegram-widget', [TelegramWidgetAuthController::class, 'handle'])
    ->middleware('throttle:auth')
    ->name('web.auth.telegram-widget');

Route::get('/auth/browser-poll/{token}', [BrowserPollController::class, 'poll'])
    ->middleware('throttle:60,1')
    ->name('web.auth.browser-poll');

Route::post('/telegram/webhook/{secret}', TelegramBotWebhookController::class)
    ->name('telegram.webhook');

Route::post('/webhook/oxa', OxaPayWebhookController::class)->name('webhook.oxa');
Route::post('/webhook/oxax', OxaPayWebhookController::class)->name('webhook.oxax');

Route::get('/{any}', function () {
    return Inertia::render('App');
})->where('any', '.*')->name('spa');
