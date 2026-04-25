<?php

declare(strict_types=1);

namespace App\Services\Payments;

/**
 * Immutable value object returned by PaymentGateway::createIntent.
 * Contains everything the Mini App needs to display instructions.
 */
final class PaymentIntent
{
    /**
     * @param  array<string, mixed>  $extra
     */
    public function __construct(
        public readonly string $walletAddress,
        public readonly int $amountMinor,
        public readonly string $currency,
        public readonly string $method,
        public readonly array $extra = [],
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'wallet_address' => $this->walletAddress,
            'amount_minor' => $this->amountMinor,
            'currency' => $this->currency,
            'method' => $this->method,
            'extra' => $this->extra,
        ];
    }
}
