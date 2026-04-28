<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\InitDataValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Diagnostic tool for Telegram bot token + initData validation.
 *
 * Usage:
 *   php artisan telegram:verify                    — checks configured bot token
 *   php artisan telegram:verify --debug-last       — shows last HMAC failure from cache
 *   php artisan telegram:verify --init-data="..."  — validates raw initData manually
 */
class TelegramVerifyCommand extends Command
{
    protected $signature = 'telegram:verify
                            {--debug-last  : Show the last failed HMAC attempt stored in cache}
                            {--init-data=  : Raw initData string to validate manually}
                            {--token=      : Override token (uses TELEGRAM_BOT_TOKEN if omitted)}';

    protected $description = 'Verify TELEGRAM_BOT_TOKEN and diagnose initData HMAC failures';

    public function handle(): int
    {
        if ($this->option('debug-last')) {
            return $this->showDebugLast();
        }

        $token = $this->resolveToken();
        if ($token === '') {
            $this->error('TELEGRAM_BOT_TOKEN is empty. Set it in .env');
            return self::FAILURE;
        }

        $this->printTokenInfo($token);
        $this->checkViaGetMe($token);

        $rawInitData = (string) $this->option('init-data');
        if ($rawInitData !== '') {
            $this->validateInitData($rawInitData, $token);
        }

        $this->line('');
        return self::SUCCESS;
    }

    // ─── --debug-last ──────────────────────────────────────────────────────────

    private function showDebugLast(): int
    {
        $snap = Cache::get('tg:hmac_debug:last');

        if ($snap === null) {
            $this->warn('No failed HMAC attempt found in cache (TTL 10 min).');
            $this->line('Open the Mini App to trigger an auth attempt, then re-run immediately.');
            return self::FAILURE;
        }

        $this->line('');
        $this->line('<options=bold>Last HMAC failure</>  (at ' . ($snap['failed_at'] ?? '?') . ')');
        $this->line('');

        $this->line('<fg=gray>Token prefix used:</>  ' . ($snap['bot_token_prefix'] ?? '?') . '*** (len=' . ($snap['bot_token_length'] ?? '?') . ')');
        $this->line('<fg=gray>Expected hash:</>      ' . ($snap['expected_hash'] ?? '?'));
        $this->line('<fg=gray>Provided hash:</>      ' . ($snap['provided_hash'] ?? '?'));

        $this->line('');
        $this->line('<fg=gray>data_check_string (what PHP computed):</>');
        $dcs = $snap['data_check_string'] ?? '';
        foreach (explode("\n", $dcs) as $line) {
            $this->line('  ' . $line);
        }

        $this->line('');
        $this->line('<fg=gray>Raw initData received by PHP (first 300 chars):</>');
        $raw = $snap['raw_init_data'] ?? '';
        $this->line('  ' . substr($raw, 0, 300) . (strlen($raw) > 300 ? '...' : ''));

        // Re-validate with current token to see if it matches now
        $this->line('');
        $this->info('Re-validating with current TELEGRAM_BOT_TOKEN …');
        $token    = $this->resolveToken();
        $computed = InitDataValidator::sign($this->parseQs($raw), $token);
        $provided = $snap['provided_hash'] ?? '';

        if (hash_equals($computed, $provided)) {
            $this->line('<fg=green;options=bold>✓ Re-validation PASSED</fg=green;options=bold> — the current token produces the correct hash.');
            $this->warn('The cache was stale when the request arrived. Run: php artisan config:cache');
        } else {
            $this->line('<fg=red;options=bold>✗ Re-validation FAILED</fg=red;options=bold> — current token still does not match.');
            $this->line('');
            $this->line('<fg=gray>data_check_string (re-computed now):</>');
            $pairs = $this->parseQs($raw);
            unset($pairs['hash'], $pairs['signature']);
            ksort($pairs);
            $dcsNow = implode("\n", array_map(fn ($k, $v) => "{$k}={$v}", array_keys($pairs), array_values($pairs)));
            foreach (explode("\n", $dcsNow) as $line) {
                $this->line('  ' . $line);
            }
            $this->line('');
            $this->warn('The data_check_string above must match what Telegram signed.');
            $this->warn('Likely cause: initData is being modified before reaching PHP (nginx body filter, middleware, etc.)');
        }

        $this->line('');
        return self::SUCCESS;
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private function resolveToken(): string
    {
        return trim((string) ($this->option('token') ?: config('telegram.bot_token') ?: env('TELEGRAM_BOT_TOKEN', '')));
    }

    private function printTokenInfo(string $token): void
    {
        $this->line('');
        $this->line('<fg=gray>Token prefix:</> ' . substr($token, 0, 12) . str_repeat('*', max(0, strlen($token) - 12)));
        $this->line('<fg=gray>Token length:</> ' . strlen($token));
        $this->line('');
    }

    private function checkViaGetMe(string $token): void
    {
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
                $this->error('→ Revoke & get new token via @BotFather, update TELEGRAM_BOT_TOKEN in .env, run: php artisan config:cache');
            }
        } catch (\Throwable $e) {
            $this->error('Could not reach api.telegram.org: ' . $e->getMessage());
        }
    }

    private function validateInitData(string $rawInitData, string $token): void
    {
        $this->line('');
        $this->info('Validating initData HMAC …');

        $pairs    = $this->parseQs($rawInitData);
        $provided = $pairs['hash'] ?? '';
        $computed = InitDataValidator::sign($pairs, $token);

        $this->line('  Expected hash:  ' . $computed);
        $this->line('  Provided hash:  ' . ($provided ?: '(missing)'));

        if ($provided === '') {
            $this->error('initData has no hash field.');
        } elseif (hash_equals($computed, $provided)) {
            $this->line('');
            $this->line('<fg=green;options=bold>✓ HMAC matches</fg=green;options=bold>');
        } else {
            $this->line('');
            $this->line('<fg=red;options=bold>✗ HMAC does NOT match</fg=red;options=bold>');
            $this->warn('The initData was signed with a different token, or was modified in transit.');
        }
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
