<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\StartHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Telegram bot webhook receiver.
 *
 * Wired up at POST /telegram/webhook/{secret}, where {secret} is matched
 * against config('telegram.webhook_secret'). The secret-in-URL is Telegram's
 * recommended pattern for protecting the webhook endpoint.
 *
 * We only handle the bare minimum for now: text messages, specifically /start.
 */
class WebhookController extends Controller
{
    public function __invoke(Request $request, string $secret, StartHandler $start): JsonResponse
    {
        $expected = (string) config('telegram.webhook_secret', '');

        if ($expected === '') {
            // env not set at all — make this LOUD so deploys without the
            // secret don't silently swallow every Telegram update.
            Log::error('[Telegram webhook] TELEGRAM_WEBHOOK_SECRET is not set in .env — every update is dropped.');
            return response()->json(['ok' => true]);
        }

        if (! hash_equals($expected, $secret)) {
            // The URL Telegram is hitting doesn't match our env. Common
            // causes: rotated secret without re-running setWebhook, or
            // config:cache holding the old value. Log the suffix of each
            // so we can spot the mismatch in storage/logs/laravel.log
            // without leaking the full secret.
            Log::error('[Telegram webhook] secret mismatch — update dropped.', [
                'env_suffix' => substr($expected, -6),
                'url_suffix' => substr($secret, -6),
            ]);
            return response()->json(['ok' => true]);
        }

        try {
            $update = $request->all();
            $message = $update['message'] ?? null;
            if (! is_array($message)) {
                Log::info('[Telegram webhook] non-message update ignored.', [
                    'update_id' => $update['update_id'] ?? null,
                    'kinds'     => array_keys($update),
                ]);
                return response()->json(['ok' => true]);
            }

            $text = (string) ($message['text'] ?? '');
            $chatId = (int) (($message['chat']['id'] ?? 0));
            $from = is_array($message['from'] ?? null) ? $message['from'] : [];

            if ($chatId <= 0 || ! is_array($from)) {
                Log::info('[Telegram webhook] message without chat_id/from ignored.');
                return response()->json(['ok' => true]);
            }

            if (str_starts_with($text, '/start')) {
                $startParam = trim(substr($text, strlen('/start')));
                $startParam = $startParam === '' ? null : $startParam;
                Log::info('[Telegram webhook] /start received.', [
                    'chat_id' => $chatId,
                    'from_id' => $from['id'] ?? null,
                    'param'   => $startParam,
                ]);
                $start->handle($chatId, $from, $startParam);
            } else {
                Log::info('[Telegram webhook] non-/start text ignored.', [
                    'chat_id' => $chatId,
                    'text'    => mb_substr($text, 0, 60),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[Telegram webhook] handler threw', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
