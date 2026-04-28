<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\InitDataValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Diagnostic tool for Telegram bot token + initData validation.
 *
 * Usage:
 *   php artisan telegram:verify                          — checks configured bot token
 *   php artisan telegram:verify --init-data="query_id=AAH...&user=...&hash=..."
 */
class TelegramVerifyCommand extends Command
{
    protected $signature = 'telegram:verify
                            {--init-data= : Raw initData string to validate}
                            {--token=     : Override token (uses TELEGRAM_BOT_TOKEN if omitted)}';

    protected $description = 'Verify TELEGRAM_BOT_TOKEN against Telegram API and optionally validate initData HMAC';

    public function handle(): int
    {
        $token = trim((string) ($this->option('token') ?: config('telegram.bot_token') ?: env('TELEGRAM_BOT_TOKEN', '')));

        if ($token === '') {
            $this->error('TELEGRAM_BOT_TOKEN is empty. Set it in .env');
            return self::FAILURE;
        }

        $this->line('');
        $this->line('<fg=gray>Token prefix:</> ' . substr($token, 0, 12) . str_repeat('*', max(0, strlen($token) - 12)));
        $this->line('<fg=gray>Token length:</> ' . strlen($token));
        $this->line('');

        // ─── 1. Check token via getMe ──────────────────────────────────────────
        $this->info('Checking token via api.telegram.org/getMe …');
        try {
            $response = Http::timeout(10)->get("https://api.telegram.org/bot{$token}/getMe");
            $body     = $response->json();

            if ($response->ok() && ($body['ok'] ?? false) === true) {
                $bot = $body['result'] ?? [];
                $this->line('');
                $this->line('<fg=green;options=bold>✓ Token is VALID</fg=green;options=bold>');
                $this->line('  Bot ID:       ' . ($bot['id']         ?? '?'));
                $this->line('  Bot username: @' . ($bot['username']  ?? '?'));
                $this->line('  Bot name:     ' . ($bot['first_name'] ?? '?'));
            } else {
                $this->line('');
                $this->line('<fg=red;options=bold>✗ Token is INVALID</fg=red;options=bold>');
                $this->line('  Telegram says: ' . ($body['description'] ?? 'unknown error'));
                $this->line('');
                $this->error('Get a new token: open @BotFather → /mybots → @ThaikyBot → API Token → Revoke & copy new one.');
                $this->error('Then update TELEGRAM_BOT_TOKEN in .env and run: php artisan config:cache');
                return self::FAILURE;
            }
        } catch (\Throwable $e) {
            $this->error('Could not reach api.telegram.org: ' . $e->getMessage());
            $this->line('(Network issue — cannot verify token remotely)');
        }

        // ─── 2. Validate initData HMAC if provided ─────────────────────────────
        $rawInitData = (string) $this->option('init-data');
        if ($rawInitData !== '') {
            $this->line('');
            $this->info('Validating initData HMAC …');
            $computed = InitDataValidator::sign($this->parseQs($rawInitData), $token);

            $parsed       = $this->parseQs($rawInitData);
            $provided     = $parsed['hash'] ?? '';

            $this->line('  Expected hash:  ' . $computed);
            $this->line('  Provided hash:  ' . $provided);

            if ($provided === '') {
                $this->error('  initData has no hash field.');
            } elseif (hash_equals($computed, $provided)) {
                $this->line('');
                $this->line('<fg=green;options=bold>✓ HMAC matches — initData is valid</fg=green;options=bold>');
            } else {
                $this->line('');
                $this->line('<fg=red;options=bold>✗ HMAC does NOT match</fg=red;options=bold>');
                $this->warn('  The initData was signed with a DIFFERENT bot token than the one configured.');
                $this->warn('  Make sure TELEGRAM_BOT_TOKEN is the token for the bot whose Mini App generates this initData.');
            }
        }

        $this->line('');
        return self::SUCCESS;
    }

    /** @return array<string,string> */
    private function parseQs(string $qs): array
    {
        $pairs = [];
        foreach (explode('&', $qs) as $chunk) {
            if ($chunk === '') {
                continue;
            }
            [$k, $v] = array_pad(explode('=', $chunk, 2), 2, '');
            $pairs[urldecode($k)] = urldecode($v);
        }
        return $pairs;
    }
}
