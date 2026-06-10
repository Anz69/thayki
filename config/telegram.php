<?php

declare(strict_types=1);

return [

    'bot_token' => env('TELEGRAM_BOT_TOKEN'),

    'init_data_ttl' => (int) env('TELEGRAM_INIT_DATA_TTL', 86400),

    'replay_cache_ttl' => (int) env('TELEGRAM_REPLAY_CACHE_TTL', 60),

    'allow_unsigned' => (bool) env('TELEGRAM_ALLOW_UNSIGNED', false),

    'replay_cache_prefix' => 'tg:initdata:',

    'miniapp_url' => env('TELEGRAM_MINIAPP_URL', ''),

    'bot_username' => env('TELEGRAM_BOT_USERNAME', ''),

    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', ''),

    'public_chat' => env('TELEGRAM_PUBLIC_CHAT', '@RusModelChat'),
];
