<?php

declare(strict_types=1);

namespace App\Services\Payments;

final class PaymentIntent
{

    public function __construct(
        public readonly string $walletAddress,
        public readonly int $amountMinor,
        public readonly string $currency,
        public readonly string $method,
        public readonly array $extra = [],
    ) {}

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
