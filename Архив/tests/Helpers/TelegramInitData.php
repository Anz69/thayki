<?php

declare(strict_types=1);

namespace Tests\Helpers;

use App\Services\Telegram\InitDataValidator;

/**
 * Helper to build synthetic Telegram Mini App initData payloads for tests.
 */
final class TelegramInitData
{
    /**
     * @param  array<string, mixed>  $userOverrides
     * @param  array<string, string>  $extraPairs
     */
    public static function build(
        array $userOverrides = [],
        array $extraPairs = [],
        ?int $authDate = null,
        string $botToken = 'test-bot-token',
    ): string {
        $user = array_merge([
            'id' => 99000001,
            'first_name' => 'Alex',
            'last_name' => 'Doe',
            'username' => 'alex_doe',
            'language_code' => 'ru',
            'is_premium' => false,
        ], $userOverrides);

        $pairs = array_merge([
            'auth_date' => (string) ($authDate ?? time()),
            'query_id' => 'test-query',
            'user' => json_encode($user, JSON_UNESCAPED_UNICODE),
        ], $extraPairs);

        return InitDataValidator::build($pairs, $botToken);
    }

    /**
     * Returns initData with a deliberately invalid hash appended.
     *
     * @param  array<string, mixed>  $userOverrides
     */
    public static function buildInvalid(array $userOverrides = []): string
    {
        $valid = self::build($userOverrides);

        return preg_replace('/hash=[^&]+/', 'hash=deadbeef', $valid) ?? $valid;
    }
}
