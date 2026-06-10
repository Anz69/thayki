<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Enums\PaymentStatus;

final class PaymentVerificationResult
{

    public function __construct(
        public readonly PaymentStatus $status,
        public readonly ?string $txHash = null,
        public readonly array $raw = [],
    ) {}

    public static function pending(): self
    {
        return new self(PaymentStatus::Pending);
    }
}
