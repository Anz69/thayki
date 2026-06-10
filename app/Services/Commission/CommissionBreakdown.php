<?php

declare(strict_types=1);

namespace App\Services\Commission;

use App\Models\PlatformEarning;

final readonly class CommissionBreakdown
{
    public function __construct(
        public int $grossMinor,
        public float $commissionRate,
        public int $commissionMinor,
        public int $netMinor,
        public string $source,
    ) {
    }

    public static function default(): self
    {
        return new self(0, 0.0, 0, 0, PlatformEarning::SOURCE_DEFAULT);
    }
}
