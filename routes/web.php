<?php

use App\Http\Controllers\Web\BrowserPollController;
use App\Http\Controllers\Web\TelegramWebAuthController;
use App\Http\Controllers\Web\TelegramWidgetAuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Broadcasting auth for Filament admin (uses 'admin' guard, not 'web')
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

// Telegram Mini App auth (session-based, not token)
Route::post('/auth/telegram', [TelegramWebAuthController::class, 'handle'])
    ->name('web.auth.telegram');

// Telegram Login Widget auth (for browser users)
Route::post('/auth/telegram-widget', [TelegramWidgetAuthController::class, 'handle'])
    ->middleware('throttle:auth')
    ->name('web.auth.telegram-widget');

// Browser tab polling: waits for Mini App to authenticate via deep-link token
Route::get('/auth/browser-poll/{token}', [BrowserPollController::class, 'poll'])
    ->middleware('throttle:60,1')
    ->name('web.auth.browser-poll');

// SPA catch-all — Inertia renders the React app shell
// All React Router navigation is client-side from here
Route::get('/{any}', function () {
    return Inertia::render('App');
})->where('any', '.*')->name('spa');
