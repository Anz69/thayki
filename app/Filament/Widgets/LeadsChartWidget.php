<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\Lead;
use Filament\Widgets\ChartWidget;

class LeadsChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Заявки по дням (30 дней)';

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected static ?string $maxHeight = '260px';

    protected function getData(): array
    {
        $days = 30;

        $created = $this->dailyCounts(Lead::query(), 'created_at', $days);
        $closed = $this->dailyCounts(
            Lead::query()->where('status', 'closed'),
            'updated_at',
            $days,
        );

        $labels = collect(range($days - 1, 0))
            ->map(fn (int $i) => now()->subDays($i)->format('d.m'))
            ->toArray();

        return [
            'datasets' => [
                [
                    'label' => 'Создано',
                    'data' => array_values($created),
                    'borderColor' => '#E2319B',
                    'backgroundColor' => 'rgba(226, 49, 155, 0.15)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
                [
                    'label' => 'Закрыто',
                    'data' => array_values($closed),
                    'borderColor' => '#22c55e',
                    'backgroundColor' => 'rgba(34, 197, 94, 0.12)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    private function dailyCounts($query, string $column, int $days): array
    {
        $rows = $query
            ->selectRaw("DATE({$column}) as day, COUNT(*) as cnt")
            ->where($column, '>=', now()->subDays($days - 1)->startOfDay())
            ->groupBy('day')
            ->pluck('cnt', 'day');

        return collect(range($days - 1, 0))
            ->map(fn (int $i) => (int) ($rows[now()->subDays($i)->format('Y-m-d')] ?? 0))
            ->toArray();
    }
}
