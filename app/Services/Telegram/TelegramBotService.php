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

    public function __construct(private readonly string $botToken)
    {
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
            // Bot is not configured for this environment — silently no-op so
            // the test/local/CI paths still work.
            return false;
        }

        $payload = [
            'chat_id' => $chatId,
            'text'    => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];

        $miniAppUrl = (string) config('telegram.miniapp_url', '');
        $botUsername = (string) config('telegram.bot_username', '');
        if ($openPath !== null) {
            $url = null;
            if ($miniAppUrl !== '') {
                $url = $this->buildMiniAppUrl($miniAppUrl, $openPath);
            } elseif ($botUsername !== '') {
                // Fallback when TELEGRAM_MINIAPP_URL isn't configured: at
                // least open the bot itself so the button isn't a dead end.
                $url = 'https://t.me/'.$botUsername;
            }
            if ($url !== null) {
                $payload['reply_markup'] = json_encode([
                    'inline_keyboard' => [[
                        ['text' => $buttonLabel ?? 'Перейти', 'url' => $url],
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

    private function endpoint(string $method): string
    {
        return self::API_BASE.'/bot'.$this->botToken.'/'.$method;
    }

    /**
     * Compose a t.me/<bot>/<app>?startapp=<token> URL when the Mini App URL is a
     * t.me deep-link, or just append a hash so the front-end can read the
     * intended path. Falls back to the raw URL when path encoding is unsafe.
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

        // t.me/<bot>/<app>?startapp=<token> — Mini App URL with start params.
        if (str_starts_with($miniAppUrl, 'https://t.me/')) {
            $token = rtrim(strtr(base64_encode($clean), '+/', '-_'), '=');
            $sep   = str_contains($miniAppUrl, '?') ? '&' : '?';
            return $miniAppUrl.$sep.'startapp='.$token;
        }

        // Plain Web URL: append the path as a hash so the SPA router can
        // pick it up via window.location.hash on load.
        $sep = str_contains($miniAppUrl, '#') ? '' : '#';
        return $miniAppUrl.$sep.$clean;
    }
}
