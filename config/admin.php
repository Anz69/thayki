<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Admin panel URL path
    |--------------------------------------------------------------------------
    | Keep the real value ONLY in .env (ADMIN_PANEL_PATH) so the login form
    | lives at a long, unguessable URL and never appears in the repository.
    | Example: ADMIN_PANEL_PATH=panel-7f3a9c2e1b8d4665
    */
    'path' => env('ADMIN_PANEL_PATH', 'admin'),

    /*
    | Telegram two-factor: code lifetime (seconds) and how long a verified
    | session stays trusted before another code is required.
    */
    'twofactor' => [
        'code_ttl' => (int) env('ADMIN_2FA_CODE_TTL', 300),
        'trust_ttl' => (int) env('ADMIN_2FA_TRUST_TTL', 43200),
    ],
];
