<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\LeadPayment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ManagerStatsController extends Controller
{
    /**
     * Fallback conversion rate from each currency's minor unit to USD minor,
     * used when the live FX feed is unavailable. (amount_minor × rate = USD
     * minor, since the /100·×100 cancels.)
     */
    private const FALLBACK_TO_USD = [
        'USD' => 1.0,
        'EUR' => 1.08,
        'RUB' => 0.011,
        'THB' => 0.028,
    ];

    /** Aggregate earnings across all confirmed lead payments, normalised to USD. */
    public function earnings(): JsonResponse
    {
        $rates = $this->ratesToUsd();
        /** @var Collection<int, LeadPayment> $payments */
        $payments = LeadPayment::query()
            ->where('status', 'confirmed')
            ->get(['amount_minor', 'currency', 'confirmed_at']);

        $usd = fn (LeadPayment $p): int => (int) round(
            ($p->amount_minor ?? 0) * ($rates[strtoupper((string) $p->currency)] ?? 0),
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

    /**
     * Live "currency-minor → USD-minor" multipliers, fetched from a free FX
     * feed and cached for 12h. Falls back to static rates on any failure.
     *
     * @return array<string, float>
     */
    private function ratesToUsd(): array
    {
        return Cache::remember('fx:to_usd_minor', now()->addHours(12), function (): array {
            try {
                $res = Http::timeout(8)->get('https://open.er-api.com/v6/latest/USD');
                if ($res->successful() && $res->json('result') === 'success') {
                    $perUsd = $res->json('rates') ?? []; // 1 USD = X currency
                    $out = [];
                    foreach (array_keys(self::FALLBACK_TO_USD) as $code) {
                        if (! empty($perUsd[$code])) {
                            $out[$code] = 1 / (float) $perUsd[$code];
                        }
                    }
                    if (! empty($out['USD'])) {
                        return $out + self::FALLBACK_TO_USD; // fill any missing
                    }
                }
            } catch (\Throwable) {
            }

            return self::FALLBACK_TO_USD;
        });
    }
}
