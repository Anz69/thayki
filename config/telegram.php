<?php

declare(strict_types=1);

return [
    /*
     * Bot token issued by @BotFather. Used as the secret for HMAC
     * verification of the Mini App initData payload.
     */
    'bot_token' => env('TELEGRAM_BOT_TOKEN'),

    /*
     * How long (in seconds) the initData is considered fresh after
     * Telegram issued `auth_date`. Replay protection rejects older values.
     */
    'init_data_ttl' => (int) env('TELEGRAM_INIT_DATA_TTL', 86400),

    /*
     * Development-only escape hatch: allow requests without a valid
     * HMAC signature when APP_ENV=local. NEVER enable in production.
     */
    'allow_unsigned' => (bool) env('TELEGRAM_ALLOW_UNSIGNED', false),

    /*
     * Prefix for the Redis anti-replay cache keys.
     */
    'replay_cache_prefix' => 'tg:initdata:',
];
