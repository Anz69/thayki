<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\StartInvite;
use Filament\Widgets\ChartWidget;

class InviteUsersPieChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Откуда приходят люди';

    protected static ?int $sort = 3;

    protected int|string|array $columnSpan = 'full';

    protected static ?string $maxHeight = '300px';

    private const PALETTE = [
        '#E2319B', '#7A5AF8', '#3E6CC4', '#1E9E4E', '#C77A12',
        '#E5484D', '#0EA5A5', '#8B5CF6', '#EC4899', '#64748B',
    ];

    protected function getData(): array
    {
        $invites = StartInvite::query()
            ->where('times_used', '>', 0)
            ->orderByDesc('times_used')
            ->limit(10)
            ->get();

        $labels = $invites->map(fn (StartInvite $i): string => ($i->label ?: ('#'.$i->id)))->toArray();
        $data = $invites->pluck('times_used')->map(fn ($n) => (int) $n)->toArray();

        return [
            'datasets' => [[
                'label' => 'Пришло людей',
                'data' => $data,
                'backgroundColor' => array_slice(self::PALETTE, 0, max(1, count($data))),
                'borderColor' => '#ffffff',
                'borderWidth' => 2,
            ]],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => ['legend' => ['position' => 'right']],
        ];
    }
}
