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

Route::middleware(['web', 'auth:admin'])->group(function (): void {
    Route::get('/admin-2fa/setup', [\App\Http\Controllers\Admin\Admin2FAController::class, 'setup'])->name('admin.2fa.setup');
    Route::get('/admin-2fa/status', [\App\Http\Controllers\Admin\Admin2FAController::class, 'status'])->name('admin.2fa.status');
    Route::get('/admin-2fa', [\App\Http\Controllers\Admin\Admin2FAController::class, 'show'])->name('admin.2fa.show');
    Route::post('/admin-2fa', [\App\Http\Controllers\Admin\Admin2FAController::class, 'verify'])->name('admin.2fa.verify');
    Route::post('/admin-2fa/resend', [\App\Http\Controllers\Admin\Admin2FAController::class, 'resend'])->name('admin.2fa.resend');
    Route::match(['get', 'post'], '/admin-2fa/logout', [\App\Http\Controllers\Admin\Admin2FAController::class, 'logout'])->name('admin.2fa.logout');
});

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

Route::get('/{any}', function (Request $request) {
    // Never let the SPA shell be cached. Telegram's in-app WebView caches HTML
    // aggressively, so after a deploy a stale document keeps referencing old,
    // now-deleted asset hashes → blank white screen that a reload can't fix
    // (the cached HTML is re-served). no-store forces a fresh shell every open,
    // while the hashed JS/CSS assets stay immutable-cacheable.
    return Inertia::render('App')->toResponse($request)
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
})->where('any', '.*')->name('spa');
