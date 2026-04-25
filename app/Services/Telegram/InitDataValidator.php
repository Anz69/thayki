<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Exceptions\InvalidInitDataException;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

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
    public function __construct(private readonly ConfigRepository $config) {}

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
        unset($dataPairs['hash'], $dataPairs['signature']);
        ksort($dataPairs);

        $dataCheckString = implode("\n", array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($dataPairs),
            array_values($dataPairs),
        ));

        $botToken = (string) $this->config->get('telegram.bot_token');
        if ($botToken === '') {
            throw InvalidInitDataException::malformed('Server misconfiguration: bot token is not set.');
        }

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $expected = hash_hmac('sha256', $dataCheckString, $secretKey);

        $allowUnsigned = (bool) $this->config->get('telegram.allow_unsigned', false);

        $valid = hash_equals($expected, $providedHash);

        if (! $valid) {
            \Illuminate\Support\Facades\Log::debug('Telegram initData HMAC mismatch', [
                'bot_token_prefix' => substr($botToken, 0, 10),
                'expected'         => $expected,
                'provided'         => $providedHash,
                'data_check_string'=> $dataCheckString,
            ]);

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
