<?php

declare(strict_types=1);

namespace App\Services\Commission;

use App\Models\AppSetting;
use App\Models\ModelProfile;
use App\Models\PlatformEarning;

class CommissionService
{
    public const SETTING_DEFAULT_RATE = 'commission_default';

    public function resolveRate(?ModelProfile $profile): array
    {
        if ($profile !== null && $profile->commission_override !== null) {
            return [
                'rate' => $this->clamp((float) $profile->commission_override),
                'source' => PlatformEarning::SOURCE_MODEL_OVERRIDE,
            ];
        }

        return [
            'rate' => $this->defaultRate(),
            'source' => PlatformEarning::SOURCE_DEFAULT,
        ];
    }

    public function calculate(int $grossMinor, ?ModelProfile $profile): CommissionBreakdown
    {
        $resolved = $this->resolveRate($profile);
        $rate = $resolved['rate'];

        $commissionMinor = (int) round($grossMinor * $rate);
        $commissionMinor = max(0, min($commissionMinor, $grossMinor));
        $netMinor = $grossMinor - $commissionMinor;

        return new CommissionBreakdown(
            grossMinor: $grossMinor,
            commissionRate: $rate,
            commissionMinor: $commissionMinor,
            netMinor: $netMinor,
            source: $resolved['source'],
        );
    }

    public function defaultRate(): float
    {
        $stored = AppSetting::get(self::SETTING_DEFAULT_RATE);

        if ($stored === null || $stored === '') {
            return $this->clamp((float) config('payments.commission', 0.15));
        }

        return $this->clamp((float) $stored);
    }

    private function clamp(float $rate): float
    {
        if ($rate < 0.0) {
            return 0.0;
        }
        if ($rate > 1.0) {
            return 1.0;
        }

        return $rate;
    }
}
