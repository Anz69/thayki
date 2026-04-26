<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\TelegramBotService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * One-shot health check for the Telegram integration.
 *
 *   php artisan telegram:diagnose
 *
 * Prints, in order:
 *   1) Whether the env variables we need are present (with masked values).
 *   2) Whether the bot token is accepted by Telegram (getMe).
 *   3) What URL Telegram currently calls for our webhook + last error.
 *   4) Whether our env's webhook secret matches the secret in the URL above.
 *
 * Optional: pass --send=<chat_id> to fire a test message to that chat to
 * confirm outbound messaging works end-to-end.
 */
class TelegramDiagnoseCommand extends Command
{
    protected $signature = 'telegram:diagnose {--send= : Telegram chat id to send a test message to}';

    protected $description = 'Diagnose Telegram bot configuration and webhook health.';

    public function handle(): int
    {
        $token   = (string) config('telegram.bot_token', '');
        $secret  = (string) config('telegram.webhook_secret', '');
        $bot     = (string) config('telegram.bot_username', '');
        $miniapp = (string) config('telegram.miniapp_url', '');

        $this->info('— Telegram diagnose —');
        $this->line(sprintf('TELEGRAM_BOT_TOKEN     : %s', $token === '' ? '<EMPTY>' : (substr($token, 0, 4).'…'.substr($token, -4))));
        $this->line(sprintf('TELEGRAM_BOT_USERNAME  : %s', $bot === '' ? '<EMPTY>' : $bot));
        $this->line(sprintf('TELEGRAM_WEBHOOK_SECRET: %s', $secret === '' ? '<EMPTY>' : ('…'.substr($secret, -6))));
        $this->line(sprintf('TELEGRAM_MINIAPP_URL   : %s', $miniapp === '' ? '<EMPTY>' : $miniapp));

        if ($token === '' || $secret === '') {
            $this->error('Missing required env vars. Fix .env and re-run.');
            return self::FAILURE;
        }

        // 2) Bot token sanity check.
        $this->newLine();
        $this->info('— getMe —');
        $bot = TelegramBotService::fromConfig();
        $me  = $bot->getMe();
        if ($me === null) {
            $this->error('getMe failed — bot token is invalid or network unreachable.');
            return self::FAILURE;
        }
        $this->line(sprintf('Bot is alive: @%s (id=%d)', $me['username'] ?? '?', $me['id'] ?? 0));

        // 3) Telegram's view of our webhook.
        $this->newLine();
        $this->info('— getWebhookInfo —');
        try {
            $resp = Http::timeout(5)->get("https://api.telegram.org/bot{$token}/getWebhookInfo");
            $info = $resp->json('result') ?? [];
            $url  = (string) ($info['url'] ?? '');
            $this->line('webhook URL          : '.($url === '' ? '<NOT SET>' : $url));
            $this->line('pending_update_count : '.($info['pending_update_count'] ?? 0));
            $this->line('last_error_date      : '.($info['last_error_date'] ?? '—'));
            $this->line('last_error_message   : '.($info['last_error_message'] ?? '—'));

            // 4) Compare URL secret tail vs env secret tail.
            if ($url !== '') {
                $urlSecret = (string) basename($url);
                if (hash_equals($secret, $urlSecret)) {
                    $this->line('URL secret matches .env: <fg=green>YES</>');
                } else {
                    $this->error("URL secret tail '…".substr($urlSecret, -6)."' does NOT match env tail '…".substr($secret, -6)."'.");
                    $this->line("Re-run setWebhook with the correct secret.");
                }
            }
        } catch (\Throwable $e) {
            $this->error('getWebhookInfo failed: '.$e->getMessage());
        }

        // Optional: outbound smoke test.
        $sendTo = $this->option('send');
        if ($sendTo) {
            $this->newLine();
            $this->info("— sendMessage test → chat_id={$sendTo} —");
            $ok = $bot->sendMessage((int) $sendTo, '✅ Telegram diagnose: бот может тебе писать.');
            $this->line($ok ? 'Sent OK.' : 'Send FAILED — check storage/logs/laravel.log.');
        }

        $this->newLine();
        $this->line('— done —');
        return self::SUCCESS;
    }
}
