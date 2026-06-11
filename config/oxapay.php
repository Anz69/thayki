<?php

declare(strict_types=1);

return [
    'api_key' => env('OXAPAY_MERCHANT_KEY', ''),
    'base_url' => rtrim((string) env('OXAPAY_BASE_URL', 'https://api.oxapay.com/v1'), '/'),
    'callback_url' => env('OXAPAY_CALLBACK_URL', env('APP_URL').'/webhook/oxa'),

    'rate_limit_ms' => (int) env('OXAPAY_RATE_LIMIT_MS', 1300),
    'margin' => (float) env('OXAPAY_MARGIN', 0.025),

    'networks' => [
        'Bitcoin',
        'Ethereum',
        'Tron',
        'BSC',
        'Polygon',
        'Litecoin',
        'Solana',
        'The Open Network',
        'Monero',
        'BitcoinCash',
    ],

    'memo_networks' => [
        'The Open Network',
    ],

    'coins' => [
        ['code' => 'BTC',  'name' => 'Bitcoin',      'network' => 'Bitcoin',          'net_label' => 'Bitcoin'],
        ['code' => 'ETH',  'name' => 'Ethereum',     'network' => 'Ethereum',         'net_label' => 'ERC-20'],
        ['code' => 'USDT', 'name' => 'Tether',       'network' => 'Tron',             'net_label' => 'TRC-20'],
        ['code' => 'USDC', 'name' => 'USD Coin',     'network' => 'Ethereum',         'net_label' => 'ERC-20'],
        ['code' => 'BNB',  'name' => 'BNB',          'network' => 'BSC',              'net_label' => 'BEP-20'],
        ['code' => 'POL',  'name' => 'Polygon',      'network' => 'Polygon',          'net_label' => 'Polygon'],
        ['code' => 'LTC',  'name' => 'Litecoin',     'network' => 'Litecoin',         'net_label' => 'Litecoin'],
        ['code' => 'SOL',  'name' => 'Solana',       'network' => 'Solana',           'net_label' => 'Solana'],
        ['code' => 'TRX',  'name' => 'TRON',         'network' => 'Tron',             'net_label' => 'TRC-20'],
        ['code' => 'TON',  'name' => 'Toncoin',      'network' => 'The Open Network', 'net_label' => 'TON'],
        ['code' => 'XMR',  'name' => 'Monero',       'network' => 'Monero',           'net_label' => 'Monero'],
        ['code' => 'BCH',  'name' => 'Bitcoin Cash', 'network' => 'BitcoinCash',      'net_label' => 'Bitcoin Cash'],
    ],
];
