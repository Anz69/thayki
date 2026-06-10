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

    private const FALLBACK_TO_USD = [
        'USD' => 1.0,
        'EUR' => 1.08,
        'RUB' => 0.011,
        'THB' => 0.028,
    ];

    public function earnings(): JsonResponse
    {
        $rates = $this->ratesToUsd();

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

    private function ratesToUsd(): array
    {
        return Cache::remember('fx:to_usd_minor', now()->addHours(12), function (): array {
            try {
                $res = Http::timeout(8)->get('https://open.er-api.com/v6/latest/USD');
                if ($res->successful() && $res->json('result') === 'success') {
                    $perUsd = $res->json('rates') ?? [];
                    $out = [];
                    foreach (array_keys(self::FALLBACK_TO_USD) as $code) {
                        if (! empty($perUsd[$code])) {
                            $out[$code] = 1 / (float) $perUsd[$code];
                        }
                    }
                    if (! empty($out['USD'])) {
                        return $out + self::FALLBACK_TO_USD;
                    }
                }
            } catch (\Throwable) {
            }

            return self::FALLBACK_TO_USD;
        });
    }
}
