<?php

declare(strict_types=1);
use App\Services\Payments\ManualPaymentGateway;

return [

    'gateway' => env('PAYMENT_GATEWAY', 'manual'),

    'currency' => env('PAYMENT_CURRENCY', 'THB'),

    'commission' => (float) env('PAYMENT_COMMISSION', 0.15),

    'withdrawal_minimum' => (int) env('PAYMENT_WITHDRAWAL_MIN', 500),

    'methods' => [
        'usdt' => [
            'label' => 'USDT (TRC-20)',
            'address' => env('PAYMENT_USDT_ADDRESS'),
            'decimals' => 2,
        ],
        'btc' => [
            'label' => 'Bitcoin',
            'address' => env('PAYMENT_BTC_ADDRESS'),
            'decimals' => 8,
        ],
        'ton' => [
            'label' => 'TON',
            'address' => env('PAYMENT_TON_ADDRESS'),
            'decimals' => 4,
        ],
    ],

    'gateways' => [
        'manual' => ManualPaymentGateway::class,
    ],
];
