<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around Telegram Bot API that we actually use:
 *   - sendMessage with optional inline-keyboard "Open in app" deep-link.
 *
 * This is intentionally fail-soft: every call swallows network/API errors
 * and logs them. A failed notification must never block the parent action
 * (placing a meeting, sending a chat message, transitioning a state, etc.).
 */
class TelegramBotService
{
    private const API_BASE = 'https://api.telegram.org';

    private readonly string $botToken;

    /**
     * $botToken defaults to the configured token so the container can ALWAYS
     * build this service via auto-resolution — without this default, any DI
     * path (or a stale queue worker that missed the explicit binding) throws
     * "Unresolvable dependency ... string $botToken" and the bot/notifications
     * silently fail.
     */
    public function __construct(?string $botToken = null)
    {
        $this->botToken = $botToken ?? (string) config('telegram.bot_token', '');
    }

    public static function fromConfig(): self
    {
        return new self((string) config('telegram.bot_token', ''));
    }

    /**
     * Send a message to a chat. `$openPath` is an in-app path (e.g. "/meeting?id=42")
     * that becomes the URL of an inline "Открыть" button via the configured
     * Mini App URL (`telegram.miniapp_url`). When no path is provided the
     * message goes out without a button.
     *
     * Returns true on 2xx, false otherwise.
     */
    public function sendMessage(int|string $chatId, string $text, ?string $openPath = null, ?string $buttonLabel = null): bool
    {
        if ($this->botToken === '') {
            return false;
        }

        $payload = [
            'chat_id' => $chatId,
            'text'    => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];

        if ($openPath !== null) {
            $webAppUrl = $this->buildDirectUrl($openPath);
            if ($webAppUrl !== null) {
                $payload['reply_markup'] = json_encode([
                    'inline_keyboard' => [[
                        ['text' => $buttonLabel ?? 'Перейти', 'web_app' => ['url' => $webAppUrl]],
                    ]],
                ], JSON_UNESCAPED_UNICODE);
            }
        }

        try {
            $response = Http::timeout(5)
                ->post($this->endpoint('sendMessage'), $payload);

            if (! $response->successful()) {
                Log::warning('[TelegramBotService] sendMessage non-2xx', [
                    'chat_id' => $chatId,
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('[TelegramBotService] sendMessage threw', [
                'chat_id' => $chatId,
                'error'   => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send a message with a custom inline keyboard (callback_data buttons).
     *
     * @param  array<int, array<int, array{text: string, data: string}>>  $rows
     */
    public function sendButtons(int|string $chatId, string $text, array $rows): bool
    {
        if ($this->botToken === '') {
            return false;
        }

        $keyboard = array_map(
            static fn (array $row) => array_map(
                static fn (array $btn) => ['text' => $btn['text'], 'callback_data' => $btn['data']],
                $row,
            ),
            $rows,
        );

        try {
            $response = Http::timeout(5)->post($this->endpoint('sendMessage'), [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
                'reply_markup' => json_encode(['inline_keyboard' => $keyboard], JSON_UNESCAPED_UNICODE),
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('[TelegramBotService] sendButtons threw', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /** Delete a message the bot sent (e.g. the language picker after a choice). */
    public function deleteMessage(int|string $chatId, int $messageId): void
    {
        if ($this->botToken === '' || $messageId <= 0) {
            return;
        }
        try {
            Http::timeout(5)->post($this->endpoint('deleteMessage'), [
                'chat_id' => $chatId,
                'message_id' => $messageId,
            ]);
        } catch (\Throwable) {
        }
    }

    /** Acknowledge a callback query (stops the loading spinner on the button). */
    public function answerCallback(string $callbackId, ?string $text = null): void
    {
        if ($this->botToken === '') {
            return;
        }
        try {
            Http::timeout(5)->post($this->endpoint('answerCallbackQuery'), array_filter([
                'callback_query_id' => $callbackId,
                'text' => $text,
            ]));
        } catch (\Throwable) {
        }
    }

    public function getMe(): ?array
    {
        if ($this->botToken === '') {
            return null;
        }
        try {
            $response = Http::timeout(5)->get($this->endpoint('getMe'));
            if (! $response->successful()) return null;
            return $response->json('result');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Register the webhook. Crucially passes `allowed_updates` INCLUDING
     * `callback_query` — without it Telegram never delivers inline-button
     * presses (e.g. the language picker), so they appear to "do nothing".
     *
     * @return array{ok: bool, body: string}
     */
    public function setWebhook(string $url): array
    {
        if ($this->botToken === '') {
            return ['ok' => false, 'body' => 'bot token is empty'];
        }
        try {
            $response = Http::timeout(10)->asJson()->post($this->endpoint('setWebhook'), [
                'url' => $url,
                'allowed_updates' => ['message', 'callback_query'],
                'drop_pending_updates' => false,
            ]);

            return ['ok' => $response->successful() && (bool) $response->json('ok'), 'body' => $response->body()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'body' => $e->getMessage()];
        }
    }

    public function getWebhookInfo(): ?array
    {
        if ($this->botToken === '') {
            return null;
        }
        try {
            $response = Http::timeout(5)->get($this->endpoint('getWebhookInfo'));
            if (! $response->successful()) return null;
            return $response->json('result');
        } catch (\Throwable) {
            return null;
        }
    }

    private function endpoint(string $method): string
    {
        return self::API_BASE.'/bot'.$this->botToken.'/'.$method;
    }

    /**
     * Build the direct HTTPS URL used for web_app inline-keyboard buttons.
     *
     * Precedence:
     *   1. TELEGRAM_MINIAPP_URL if it is already a plain HTTPS URL (not t.me).
     *   2. APP_URL — the canonical domain of the application.
     *
     * Returns null only when neither config value is set (should never happen
     * in production).
     */
    private function buildDirectUrl(string $openPath): ?string
    {
        $clean = '/'.ltrim($openPath, '/');

        $miniAppUrl = (string) config('telegram.miniapp_url', '');
        if ($miniAppUrl !== '' && ! str_starts_with($miniAppUrl, 'https://t.me/')) {
            return rtrim($miniAppUrl, '/').$clean;
        }

        $appUrl = (string) config('app.url', '');
        if ($appUrl !== '') {
            return rtrim($appUrl, '/').$clean;
        }

        return null;
    }

    /**
     * Compose a t.me/<bot>/<app>?startapp=<token> URL when the Mini App URL is a
     * t.me deep-link, or just append a hash so the front-end can read the
     * intended path. Falls back to the raw URL when path encoding is unsafe.
     *
     * NOTE: This method is kept for reference / direct-link generation (e.g.
     * start-command buttons). Notification inline buttons now use web_app
     * buttons via buildDirectUrl() instead.
     *
     * IMPORTANT: Telegram restricts `startapp` to [A-Za-z0-9_-]{1,64}. Plain
     * base64 contains `+`, `/`, `=` — when we send those Telegram silently
     * drops the start_param entirely and the Mini App opens at its default
     * URL, which makes inline-keyboard buttons appear "broken". We therefore
     * encode with **base64url** (`-` for `+`, `_` for `/`, no padding) and
     * the SPA front-end (resources/js/app.jsx) does the inverse mapping
     * before atob().
     */
    private function buildMiniAppUrl(string $miniAppUrl, string $openPath): string
    {
        $clean = '/'.ltrim($openPath, '/');

        if (str_starts_with($miniAppUrl, 'https://t.me/')) {
            $token = rtrim(strtr(base64_encode($clean), '+/', '-_'), '=');
            $sep   = str_contains($miniAppUrl, '?') ? '&' : '?';
            return $miniAppUrl.$sep.'startapp='.$token;
        }

        $sep = str_contains($miniAppUrl, '#') ? '' : '#';
        return $miniAppUrl.$sep.$clean;
    }
}
