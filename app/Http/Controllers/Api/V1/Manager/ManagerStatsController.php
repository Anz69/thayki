<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use App\Models\LeadPayment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class ManagerStatsController extends Controller
{
    /** Aggregate earnings across all confirmed lead payments. */
    public function earnings(): JsonResponse
    {
        $confirmed = LeadPayment::query()->where('status', 'confirmed');

        $sum = fn (?Carbon $since) => (int) (clone $confirmed)
            ->when($since, fn ($q) => $q->where('confirmed_at', '>=', $since))
            ->sum('amount_minor');

        // Daily totals for the last 14 days (oldest → newest), zero-filled.
        $days = 14;
        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $start = now()->subDays($i)->startOfDay();
            $end = (clone $start)->addDay();
            $series[] = [
                'date' => $start->toDateString(),
                'amount' => (int) (clone $confirmed)
                    ->where('confirmed_at', '>=', $start)
                    ->where('confirmed_at', '<', $end)
                    ->sum('amount_minor'),
            ];
        }

        return ApiResponse::ok([
            'currency' => 'THB',
            'today' => $sum(now()->startOfDay()),
            'week' => $sum(now()->subDays(6)->startOfDay()),
            'month' => $sum(now()->startOfMonth()),
            'total' => $sum(null),
            'count' => (clone $confirmed)->count(),
            'series' => $series,
        ]);
    }
}
