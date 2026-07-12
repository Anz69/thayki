<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\StartHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __invoke(Request $request, string $secret, StartHandler $start): JsonResponse
    {
        $expected = (string) config('telegram.webhook_secret', '');

        if ($expected === '') {
            Log::error('[Telegram webhook] TELEGRAM_WEBHOOK_SECRET is not set in .env — every update is dropped.');
            return response()->json(['ok' => true]);
        }

        if (! hash_equals($expected, $secret)) {
            Log::error('[Telegram webhook] secret mismatch — update dropped.', [
                'env_suffix' => substr($expected, -6),
                'url_suffix' => substr($secret, -6),
            ]);
            return response()->json(['ok' => true]);
        }

        try {
            $update = $request->all();

            $callback = $update['callback_query'] ?? null;
            if (is_array($callback)) {
                $data = (string) ($callback['data'] ?? '');
                $cbId = (string) ($callback['id'] ?? '');
                $cbChat = (int) ($callback['message']['chat']['id'] ?? 0);
                $cbFrom = is_array($callback['from'] ?? null) ? $callback['from'] : [];
                if (str_starts_with($data, 'lang:') && $cbChat > 0 && $cbFrom !== []) {
                    $lang = substr($data, 5);
                    $langLabel = match ($lang) {
                        'en' => 'English ✓',
                        'zh' => '中文 ✓',
                        default => 'Русский ✓',
                    };
                    $start->bot()->answerCallback($cbId, $langLabel);

                    $cbMsgId = (int) ($callback['message']['message_id'] ?? 0);
                    if ($cbMsgId > 0) {
                        $start->bot()->deleteMessage($cbChat, $cbMsgId);
                    }
                    $start->chooseLanguage($cbChat, $cbFrom, $lang);
                } elseif ((str_starts_with($data, 'adminlink_ok:') || str_starts_with($data, 'adminlink_no:')) && $cbChat > 0) {
                    $this->handleAdminLinkCallback($start, $data, $cbId, $cbChat, (int) ($callback['message']['message_id'] ?? 0));
                } elseif ($cbId !== '') {
                    $start->bot()->answerCallback($cbId);
                }

                return response()->json(['ok' => true]);
            }

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

    private function handleAdminLinkCallback(StartHandler $start, string $data, string $cbId, int $cbChat, int $cbMsgId): void
    {
        [$action, $token] = array_pad(explode(':', $data, 2), 2, '');
        $twoFactor = app(\App\Services\Admin\AdminTwoFactor::class);
        $admin = $token !== '' ? $twoFactor->resolveLinkToken($token) : null;

        if ($cbMsgId > 0) {
            $start->bot()->deleteMessage($cbChat, $cbMsgId);
        }

        if ($action === 'adminlink_no') {
            if ($token !== '') {
                $twoFactor->consumeLinkToken($token);
            }
            $start->bot()->answerCallback($cbId, 'Отменено');
            $start->bot()->sendMessage($cbChat, '✖ Привязка отменена.');

            return;
        }

        if ($admin === null) {
            $start->bot()->answerCallback($cbId, 'Ссылка устарела');
            $start->bot()->sendMessage($cbChat, '🔐 Ссылка устарела. Сгенерируйте новую в админ-панели.');

            return;
        }

        $twoFactor->bind($admin, $cbChat);
        $twoFactor->consumeLinkToken($token);
        $start->bot()->answerCallback($cbId, 'Привязано ✓');
        $start->bot()->sendMessage($cbChat, '✅ Готово! Этот Telegram привязан к админ-панели. Теперь при входе сюда будут приходить коды подтверждения.');
    }
}
