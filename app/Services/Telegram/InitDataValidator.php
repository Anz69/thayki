<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Exceptions\InvalidInitDataException;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Facades\Http;

/**
 * Validates a Telegram Mini App `initData` raw query string.
 *
 * Algorithm (per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
 *   1. Parse query string, split into pairs.
 *   2. Extract `hash` from the pairs.
 *   3. Build data_check_string = sorted pairs joined with "\n" as "key=value".
 *   4. secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)     (raw)
 *   5. expected   = HMAC_SHA256(key=secret_key,   message=data_check_string)
 *   6. hash_equals(expected, provided_hash)
 *   7. auth_date freshness check.
 */
class InitDataValidator
{
    public function __construct(
        private readonly ConfigRepository $config,
        private readonly CacheRepository  $cache,
    ) {}

    /**
     * @return array{
     *   hash: string,
     *   auth_date: int,
     *   user: array<string, mixed>,
     *   raw: array<string, string>
     * }
     */
    public function validate(string $rawInitData): array
    {
        if (trim($rawInitData) === '') {
            throw InvalidInitDataException::malformed('Empty initData.');
        }

        $pairs = $this->parse($rawInitData);

        if (! isset($pairs['hash'])) {
            throw InvalidInitDataException::malformed('Missing hash field.');
        }

        if (! isset($pairs['auth_date'])) {
            throw InvalidInitDataException::malformed('Missing auth_date field.');
        }

        $authDate = (int) $pairs['auth_date'];
        if ($authDate <= 0) {
            throw InvalidInitDataException::malformed('Invalid auth_date value.');
        }

        $providedHash = (string) $pairs['hash'];

        $dataPairs = $pairs;
        unset($dataPairs['hash']);
        ksort($dataPairs);

        $dataCheckString = implode("\n", array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($dataPairs),
            array_values($dataPairs),
        ));

        // Read bot token from config, fall back to env() directly in case
        // config:cache is stale (e.g. token was updated in .env after caching).
        // Always trim to avoid whitespace/CRLF issues in .env files.
        $botToken = trim((string) $this->config->get('telegram.bot_token', ''));
        if ($botToken === '') {
            $botToken = trim((string) env('TELEGRAM_BOT_TOKEN', ''));
        }

        if ($botToken === '') {
            throw InvalidInitDataException::malformed('Server misconfiguration: bot token is not set.');
        }

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $expected = hash_hmac('sha256', $dataCheckString, $secretKey);

        $allowUnsigned = (bool) $this->config->get('telegram.allow_unsigned', false);

        $valid = hash_equals($expected, $providedHash);

        if (! $valid) {
            // Auto-diagnose: verify the bot token against Telegram API (cached 1 h).
            // This distinguishes "wrong token in .env" from "tampered initData".
            $tokenStatus = $this->checkBotToken($botToken);

            if ($tokenStatus === false) {
                \Illuminate\Support\Facades\Log::error(
                    'TELEGRAM_BOT_TOKEN is INVALID — call /newtoken in @BotFather, update .env and run php artisan config:cache',
                    ['token_prefix' => substr($botToken, 0, 12), 'token_length' => strlen($botToken)]
                );
                throw InvalidInitDataException::malformed(
                    'Неверный TELEGRAM_BOT_TOKEN. Получите новый токен через @BotFather и обновите .env на сервере.'
                );
            }

            // Store debug snapshot so `php artisan telegram:verify --debug-last` can
            // display the exact raw initData and data_check_string that failed.
            $this->cache->put('tg:hmac_debug:last', [
                'raw_init_data'     => $rawInitData,
                'data_check_string' => $dataCheckString,
                'expected_hash'     => $expected,
                'provided_hash'     => $providedHash,
                'bot_token_prefix'  => substr($botToken, 0, 12),
                'bot_token_length'  => strlen($botToken),
                'failed_at'         => now()->toIso8601String(),
            ], 600);

            \Illuminate\Support\Facades\Log::error(
                'Telegram initData HMAC mismatch — token is valid but signature does not match. Run: php artisan telegram:verify --debug-last',
                [
                    'bot_token_prefix'  => substr($botToken, 0, 12),
                    'expected'          => $expected,
                    'provided'          => $providedHash,
                    'data_check_string' => $dataCheckString,
                ]
            );

            if (! $allowUnsigned) {
                throw InvalidInitDataException::signature();
            }

            \Illuminate\Support\Facades\Log::warning(
                'Telegram initData HMAC skipped — TELEGRAM_ALLOW_UNSIGNED=true. Remove this flag once the signature issue is resolved.'
            );
        }

        $ttl = (int) $this->config->get('telegram.init_data_ttl', 86400);
        if (time() - $authDate > $ttl) {
            throw InvalidInitDataException::expired();
        }

        if (! isset($pairs['user'])) {
            throw InvalidInitDataException::malformed('Missing user field.');
        }

        $decoded = json_decode($pairs['user'], true);
        if (! is_array($decoded) || ! isset($decoded['id'], $decoded['first_name'])) {
            throw InvalidInitDataException::malformed('Malformed user payload.');
        }

        return [
            'hash' => $providedHash,
            'auth_date' => $authDate,
            'user' => $decoded,
            'raw' => $pairs,
        ];
    }

    /**
     * Verify the bot token against Telegram's getMe API.
     * Returns true = valid, false = invalid, null = could not determine (network error).
     * Result is cached for 1 hour to avoid hammering the API.
     */
    public function checkBotToken(string $token): ?bool
    {
        $cacheKey = 'tg:token_ok:' . md5($token);
        $cached   = $this->cache->get($cacheKey);

        if ($cached !== null) {
            return (bool) $cached;
        }

        try {
            $response = Http::timeout(5)->get("https://api.telegram.org/bot{$token}/getMe");
            $ok       = $response->ok() && $response->json('ok') === true;
            $this->cache->put($cacheKey, $ok, 3600);
            return $ok;
        } catch (\Throwable) {
            return null; // network unreachable — cannot determine
        }
    }

    /**
     * Computes a hash that the Mini App would send for the given pairs so
     * tests can build synthetic initData strings.
     *
     * @param  array<string, string>  $pairs
     */
    public static function sign(array $pairs, string $botToken): string
    {
        unset($pairs['hash']);
        ksort($pairs);
        $dataCheckString = implode("\n", array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($pairs),
            array_values($pairs),
        ));
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);

        return hash_hmac('sha256', $dataCheckString, $secretKey);
    }

    /**
     * @param  array<string, string|int|bool>  $pairs
     */
    public static function build(array $pairs, string $botToken): string
    {
        $stringified = [];
        foreach ($pairs as $k => $v) {
            if (is_bool($v)) {
                $stringified[$k] = $v ? 'true' : 'false';
            } else {
                $stringified[$k] = (string) $v;
            }
        }
        $hash = self::sign($stringified, $botToken);
        $stringified['hash'] = $hash;

        return http_build_query($stringified, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * @return array<string, string>
     */
    private function parse(string $initData): array
    {
        $pairs = [];
        foreach (explode('&', $initData) as $chunk) {
            if ($chunk === '') {
                continue;
            }
            $parts = explode('=', $chunk, 2);
            $key = urldecode($parts[0]);
            $value = isset($parts[1]) ? urldecode($parts[1]) : '';
            $pairs[$key] = $value;
        }

        return $pairs;
    }
}
