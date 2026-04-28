<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use Filament\Widgets\ChartWidget;

class RevenueChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Выручка по дням за 30 дней (฿)';

    protected static ?int $sort = 3;

    protected static ?string $maxHeight = '240px';

    protected function getData(): array
    {
        $days = collect(range(29, 0))
            ->map(fn (int $i) => now()->subDays($i)->startOfDay());

        $revenue = Meeting::selectRaw('DATE(completed_at) as day, SUM(price_thb) as total')
            ->where('status', MeetingStatus::Completed)
            ->where('completed_at', '>=', now()->subDays(30)->startOfDay())
            ->groupBy('day')
            ->pluck('total', 'day');

        $dailyTotals = $days->map(fn ($d) => (int) ($revenue[$d->format('Y-m-d')] ?? 0));
        $cumulative  = collect();
        $running     = 0;
        foreach ($dailyTotals as $val) {
            $running += $val;
            $cumulative->push($running);
        }

        $labels = $days->map(fn ($d) => $d->format('d.m'))->toArray();

        return [
            'datasets' => [
                [
                    'label'           => 'За день (฿)',
                    'data'            => $dailyTotals->toArray(),
                    'type'            => 'bar',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.55)',
                    'borderColor'     => 'rgba(16, 185, 129, 0.8)',
                    'borderRadius'    => 4,
                    'yAxisID'         => 'y',
                ],
                [
                    'label'           => 'Накопительно (฿)',
                    'data'            => $cumulative->toArray(),
                    'type'            => 'line',
                    'borderColor'     => 'rgba(59, 130, 246, 0.9)',
                    'backgroundColor' => 'rgba(59, 130, 246, 0.06)',
                    'fill'            => true,
                    'tension'         => 0.4,
                    'pointRadius'     => 2,
                    'yAxisID'         => 'y1',
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return [
            'scales' => [
                'y'  => ['position' => 'left',  'beginAtZero' => true],
                'y1' => ['position' => 'right', 'beginAtZero' => true, 'grid' => ['drawOnChartArea' => false]],
            ],
            'interaction' => ['mode' => 'index', 'intersect' => false],
            'plugins'     => ['legend' => ['position' => 'top']],
        ];
    }
}
