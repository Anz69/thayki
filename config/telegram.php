<?php

declare(strict_types=1);

return [
    /*
     * Bot token issued by @BotFather. Used as the secret for HMAC
     * verification of the Mini App initData payload, and for outbound
     * Bot API calls (sendMessage, etc.).
     */
    'bot_token' => env('TELEGRAM_BOT_TOKEN'),

    /*
     * How long (in seconds) the initData is considered fresh after
     * Telegram issued `auth_date`. Requests with an older auth_date are
     * rejected as stale.
     */
    'init_data_ttl' => (int) env('TELEGRAM_INIT_DATA_TTL', 86400),

    /*
     * How long (in seconds) the anti-replay cache lock is held for a given
     * initData hash. This only needs to be long enough to block a
     * double-submit within a single login request — NOT the full initData
     * validity window.
     *
     * Using init_data_ttl (24 h) here was wrong: it prevented the user from
     * re-authenticating (e.g. after a token revocation) for a full day,
     * because their stored token was cleared but Telegram's WebApp hadn't
     * refreshed initData yet. 60 seconds is enough to stop replay attacks
     * while allowing legitimate re-auth with the same initData.
     */
    'replay_cache_ttl' => (int) env('TELEGRAM_REPLAY_CACHE_TTL', 60),

    /*
     * Development-only escape hatch: allow requests without a valid
     * HMAC signature when APP_ENV=local. NEVER enable in production.
     */
    'allow_unsigned' => (bool) env('TELEGRAM_ALLOW_UNSIGNED', false),

    /*
     * Prefix for the Redis anti-replay cache keys.
     */
    'replay_cache_prefix' => 'tg:initdata:',

    /*
     * Public URL of the Telegram Mini App. Used as the base for the
     * "Open in app" deep-links attached to outbound bot notifications.
     *
     * Either:
     *   - https://t.me/<bot_username>/<app_name>   (Mini App via t.me)
     *   - https://your-app.com                     (Web URL fallback;
     *                                              SPA reads location.hash)
     */
    'miniapp_url' => env('TELEGRAM_MINIAPP_URL', ''),

    /*
     * Bot username (without @). Used to render full t.me/<bot>?start=… links
     * in the Filament admin for invite tokens.
     */
    'bot_username' => env('TELEGRAM_BOT_USERNAME', ''),

    /*
     * Secret path segment for the bot webhook. Telegram delivers updates
     * to POST /telegram/webhook/{secret}. We compare {secret} against this
     * value via hash_equals to drop spoofed traffic.
     */
    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', ''),

    /*
     * Public chat/channel handle shown to not-yet-verified users in the bot's
     * welcome ("join our chat @..."). Set TELEGRAM_PUBLIC_CHAT in .env.
     */
    'public_chat' => env('TELEGRAM_PUBLIC_CHAT', '@RusModelChat'),
];
