<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\TelegramBotService;
use Illuminate\Console\Command;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:set-webhook {url? : Full webhook URL; defaults to APP_URL/telegram/webhook/<secret>} {--show : Only print current getWebhookInfo}';

    protected $description = 'Register the Telegram bot webhook (with message + callback_query updates)';

    public function handle(): int
    {
        $bot = TelegramBotService::fromConfig();

        if ($this->option('show')) {
            return $this->printInfo($bot);
        }

        $secret = (string) config('telegram.webhook_secret', '');
        if ($secret === '') {
            $this->error('TELEGRAM_WEBHOOK_SECRET is not set in .env — set it first.');

            return self::FAILURE;
        }

        $url = (string) ($this->argument('url') ?: rtrim((string) config('app.url'), '/').'/telegram/webhook/'.$secret);
        if (! str_starts_with($url, 'https://')) {
            $this->error("Webhook URL must be HTTPS. Got: {$url}");

            return self::FAILURE;
        }

        $this->line('Setting webhook → '.$url);
        $result = $bot->setWebhook($url);

        if (! $result['ok']) {
            $this->error('setWebhook failed: '.$result['body']);

            return self::FAILURE;
        }

        $this->info('Webhook set with allowed_updates = [message, callback_query].');

        return $this->printInfo($bot);
    }

    private function printInfo(TelegramBotService $bot): int
    {
        $info = $bot->getWebhookInfo();
        if ($info === null) {
            $this->warn('Could not fetch getWebhookInfo (check bot token / network).');

            return self::SUCCESS;
        }

        $this->table(['field', 'value'], [
            ['url', $info['url'] ?? '—'],
            ['pending_update_count', (string) ($info['pending_update_count'] ?? 0)],
            ['allowed_updates', implode(', ', $info['allowed_updates'] ?? []) ?: '(all default)'],
            ['last_error_message', $info['last_error_message'] ?? '—'],
        ]);

        if (! in_array('callback_query', $info['allowed_updates'] ?? [], true) && ! empty($info['allowed_updates'])) {
            $this->warn('callback_query is NOT in allowed_updates — inline buttons will not work.');
        }

        return self::SUCCESS;
    }
}
