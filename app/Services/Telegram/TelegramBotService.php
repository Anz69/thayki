<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotService
{
    private const API_BASE = 'https://api.telegram.org';

    private readonly string $botToken;

    public function __construct(?string $botToken = null)
    {
        $this->botToken = $botToken ?? (string) config('telegram.bot_token', '');
    }

    public static function fromConfig(): self
    {
        return new self((string) config('telegram.bot_token', ''));
    }

    public function sendMessage(int|string $chatId, string $text, ?string $openPath = null, ?string $buttonLabel = null, bool $pin = false): bool
    {
        return $this->sendMessageReturningId($chatId, $text, $openPath, $buttonLabel, $pin) !== null;
    }

    // Same as sendMessage but returns the Telegram message_id on success (null on
    // failure) so callers can store it — needed to later delete client notifications.
    public function sendMessageReturningId(int|string $chatId, string $text, ?string $openPath = null, ?string $buttonLabel = null, bool $pin = false): ?int
    {
        if ($this->botToken === '') {
            return null;
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
                return null;
            }

            $messageId = (int) ($response->json('result.message_id') ?? 0);

            if ($pin && $messageId > 0) {
                $this->pinWelcome($chatId, $messageId);
            }

            return $messageId > 0 ? $messageId : null;
        } catch (\Throwable $e) {
            Log::warning('[TelegramBotService] sendMessage threw', [
                'chat_id' => $chatId,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }

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

    // Pin a message as the single "welcome" pin: drop any previous pin, pin the new
    // one silently, then delete the "Bot pinned a message" service message Telegram
    // auto-posts. disable_notification only mutes the push — it does NOT stop the
    // service message, which is why we delete it. In a private chat the service
    // message is the next message after the pinned one (id + 1).
    public function pinWelcome(int|string $chatId, int $messageId): void
    {
        if ($this->botToken === '' || $messageId <= 0) {
            return;
        }
        try {
            Http::timeout(5)->post($this->endpoint('unpinAllChatMessages'), [
                'chat_id' => $chatId,
            ]);
        } catch (\Throwable) {
        }
        try {
            Http::timeout(5)->post($this->endpoint('pinChatMessage'), [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'disable_notification' => true,
            ]);
        } catch (\Throwable) {
        }
        $this->deleteMessage($chatId, $messageId + 1);
    }

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

    private function buildDirectUrl(string $openPath): ?string
    {
        $clean = '/'.ltrim($openPath, '/');

        $miniAppUrl = (string) config('telegram.miniapp_url', '');
        if ($miniAppUrl !== '' && ! str_starts_with($miniAppUrl, 'https://t.me/')) {
            return $this->appendBuildVersion(rtrim($miniAppUrl, '/').$clean);
        }

        $appUrl = (string) config('app.url', '');
        if ($appUrl !== '') {
            return $this->appendBuildVersion(rtrim($appUrl, '/').$clean);
        }

        return null;
    }

    // Telegram's WebView caches a mini-app page by its URL and can keep serving a
    // stale one after a deploy (blank screen, dead chunk). Tagging the open URL with
    // the current build makes every deploy a "new" URL → guaranteed fresh fetch.
    private function appendBuildVersion(string $url): string
    {
        try {
            $ts = @filemtime(public_path('build/manifest.json'));
        } catch (\Throwable) {
            $ts = null;
        }
        if (! $ts) {
            return $url;
        }
        $sep = str_contains($url, '?') ? '&' : '?';

        return $url.$sep.'v='.$ts;
    }

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
