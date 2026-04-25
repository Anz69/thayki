<?php

declare(strict_types=1);
use App\Services\Payments\ManualPaymentGateway;

return [
    /*
     * Active gateway alias. Must be a key of the `gateways` array.
     * Additional gateways can be registered without touching callers.
     */
    'gateway' => env('PAYMENT_GATEWAY', 'manual'),

    /*
     * ISO-4217 currency code used for all meeting prices and wallets.
     */
    'currency' => env('PAYMENT_CURRENCY', 'THB'),

    /*
     * Platform commission withheld from the gross meeting price when the
     * payment is confirmed. Stored as a fractional value in [0, 1].
     */
    'commission' => (float) env('PAYMENT_COMMISSION', 0.15),

    /*
     * Minimum withdrawal amount (in major currency units, e.g. THB).
     */
    'withdrawal_minimum' => (int) env('PAYMENT_WITHDRAWAL_MIN', 500),

    /*
     * Supported payment methods exposed to clients.
     */
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

    /*
     * Gateway registry. Each key resolves to a concrete implementation
     * of App\Services\Payments\Contracts\PaymentGateway.
     */
    'gateways' => [
        'manual' => ManualPaymentGateway::class,
    ],
];
