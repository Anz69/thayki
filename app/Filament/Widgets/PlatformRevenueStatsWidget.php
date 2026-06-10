<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\PlatformEarning;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PlatformRevenueStatsWidget extends BaseWidget
{
    protected static ?int $sort = 2;

    protected function getStats(): array
    {
        $today = (int) PlatformEarning::query()
            ->where('confirmed_at', '>=', now()->startOfDay())
            ->sum('commission_minor');

        $month = (int) PlatformEarning::query()
            ->where('confirmed_at', '>=', now()->startOfMonth())
            ->sum('commission_minor');

        $total = (int) PlatformEarning::query()->sum('commission_minor');

        $last30Avg = (float) PlatformEarning::query()
            ->where('confirmed_at', '>=', now()->subDays(30)->startOfDay())
            ->avg('commission_rate');

        $sparkline = $this->dailyCommissionSeries(7);

        return [
            Stat::make('Доход платформы сегодня', self::money($today))
                ->description(self::money($month).' за месяц')
                ->descriptionIcon('heroicon-m-calendar')
                ->color('success'),

            Stat::make('Доход платформы всего', self::money($total))
                ->description('С момента запуска')
                ->descriptionIcon('heroicon-m-banknotes')
                ->chart($sparkline)
                ->color('success'),

            Stat::make('Средняя ставка (30 дн.)', $last30Avg > 0
                    ? number_format($last30Avg * 100, 2).' %'
                    : '—')
                ->description('По всем подтверждённым платежам')
                ->descriptionIcon('heroicon-m-percent-badge')
                ->color('info'),
        ];
    }

    private function dailyCommissionSeries(int $days): array
    {
        $rows = PlatformEarning::query()
            ->selectRaw('DATE(confirmed_at) as day, SUM(commission_minor) as total')
            ->where('confirmed_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range($days - 1, 0))
            ->map(fn (int $i) => (int) round(((int) ($rows[now()->subDays($i)->format('Y-m-d')] ?? 0)) / 100))
            ->toArray();
    }

    private static function money(int $minor): string
    {
        return number_format($minor / 100, 0, '.', ' ').' ฿';
    }
}
