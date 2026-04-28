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
