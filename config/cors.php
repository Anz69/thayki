<?php

declare(strict_types=1);

$origins = array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*')));

return [
    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['X-RateLimit-Remaining', 'X-RateLimit-Limit', 'Retry-After'],

    'max_age' => 3600,

    'supports_credentials' => false,
];
