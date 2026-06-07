<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\LeadPayment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ManagerStatsController extends Controller
{
    /**
     * Approximate conversion rate from each currency's minor unit to USD
     * cents (1 unit of currency-minor → this many USD-minor). Since
     * amount_minor and the result are both in minor units, the /100·×100
     * cancels and we can multiply amount_minor directly.
     */
    private const TO_USD = [
        'USD' => 1.0,
        'EUR' => 1.08,
        'RUB' => 0.011,
        'THB' => 0.028,
    ];

    /** Aggregate earnings across all confirmed lead payments, normalised to USD. */
    public function earnings(): JsonResponse
    {
        /** @var Collection<int, LeadPayment> $payments */
        $payments = LeadPayment::query()
            ->where('status', 'confirmed')
            ->get(['amount_minor', 'currency', 'confirmed_at']);

        $usd = fn (LeadPayment $p): int => (int) round(
            ($p->amount_minor ?? 0) * (self::TO_USD[strtoupper((string) $p->currency)] ?? 0),
        );

        $sumSince = fn (?Carbon $since): int => $payments
            ->filter(fn (LeadPayment $p) => $since === null
                || ($p->confirmed_at !== null && $p->confirmed_at->gte($since)))
            ->sum($usd);

        // Daily totals for the last 14 days (oldest → newest), zero-filled.
        $days = 14;
        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $start = now()->subDays($i)->startOfDay();
            $end = (clone $start)->addDay();
            $series[] = [
                'date' => $start->toDateString(),
                'amount' => (int) $payments
                    ->filter(fn (LeadPayment $p) => $p->confirmed_at !== null
                        && $p->confirmed_at->gte($start) && $p->confirmed_at->lt($end))
                    ->sum($usd),
            ];
        }

        return ApiResponse::ok([
            'currency' => 'USD',
            'today' => $sumSince(now()->startOfDay()),
            'week' => $sumSince(now()->subDays(6)->startOfDay()),
            'month' => $sumSince(now()->startOfMonth()),
            'total' => $sumSince(null),
            'count' => $payments->count(),
            'series' => $series,
        ]);
    }
}
