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
        if ($expected === '' || ! hash_equals($expected, $secret)) {
            // 200 OK so Telegram doesn't keep retrying — but we don't act.
            return response()->json(['ok' => true]);
        }

        try {
            $update = $request->all();
            $message = $update['message'] ?? null;
            if (! is_array($message)) {
                return response()->json(['ok' => true]);
            }

            $text = (string) ($message['text'] ?? '');
            $chatId = (int) (($message['chat']['id'] ?? 0));
            $from = is_array($message['from'] ?? null) ? $message['from'] : [];

            if ($chatId <= 0 || ! is_array($from)) {
                return response()->json(['ok' => true]);
            }

            if (str_starts_with($text, '/start')) {
                $startParam = trim(substr($text, strlen('/start')));
                $startParam = $startParam === '' ? null : $startParam;
                $start->handle($chatId, $from, $startParam);
            }
        } catch (\Throwable $e) {
            Log::warning('[Telegram webhook] handler failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
