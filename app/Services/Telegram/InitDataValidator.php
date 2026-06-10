<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Exceptions\InvalidInitDataException;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Facades\Http;

class InitDataValidator
{
    public function __construct(
        private readonly ConfigRepository $config,
        private readonly CacheRepository  $cache,
    ) {}

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
        unset($dataPairs['hash'], $dataPairs['signature']);
        ksort($dataPairs);

        $dataCheckString = implode("\n", array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($dataPairs),
            array_values($dataPairs),
        ));

        $botToken = trim((string) $this->config->get('telegram.bot_token', ''));
        if ($botToken === '') {
            $botToken = trim((string) env('TELEGRAM_BOT_TOKEN', ''));
        }

        $isLocal = $this->config->get('app.env') === 'local';
        $allowUnsigned = $isLocal || (bool) $this->config->get('telegram.allow_unsigned', false);

        if ($botToken === '' && ! $allowUnsigned) {
            throw InvalidInitDataException::malformed('Server misconfiguration: bot token is not set.');
        }

        $valid = false;
        if ($botToken !== '') {
            $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
            $expected = hash_hmac('sha256', $dataCheckString, $secretKey);
            $valid = hash_equals($expected, $providedHash);
        }

        if (! $valid && $allowUnsigned) {

            \Illuminate\Support\Facades\Log::warning(
                'Telegram initData HMAC skipped — unsigned login allowed (APP_ENV=local or TELEGRAM_ALLOW_UNSIGNED=true).'
            );
        } elseif (! $valid) {

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

            throw InvalidInitDataException::signature();
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
            return null;
        }
    }

    public static function sign(array $pairs, string $botToken): string
    {
        unset($pairs['hash'], $pairs['signature']);
        ksort($pairs);
        $dataCheckString = implode("\n", array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($pairs),
            array_values($pairs),
        ));
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);

        return hash_hmac('sha256', $dataCheckString, $secretKey);
    }

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
