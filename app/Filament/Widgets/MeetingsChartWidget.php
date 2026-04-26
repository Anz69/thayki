<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use Filament\Widgets\ChartWidget;

class MeetingsChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Встречи по дням (14 дней)';

    protected static ?int $sort = 2;

    protected static ?string $maxHeight = '240px';

    protected function getData(): array
    {
        $days = collect(range(13, 0))
            ->map(fn (int $i) => now()->subDays($i)->startOfDay());

        $allMeetings = Meeting::selectRaw('DATE(created_at) as day, COUNT(*) as cnt')
            ->where('created_at', '>=', now()->subDays(14)->startOfDay())
            ->groupBy('day')
            ->pluck('cnt', 'day');

        $completed = Meeting::selectRaw('DATE(completed_at) as day, COUNT(*) as cnt')
            ->where('status', MeetingStatus::Completed)
            ->where('completed_at', '>=', now()->subDays(14)->startOfDay())
            ->groupBy('day')
            ->pluck('cnt', 'day');

        $labels       = $days->map(fn ($d) => $d->format('d.m'))->toArray();
        $dataAll       = $days->map(fn ($d) => (int) ($allMeetings[$d->format('Y-m-d')] ?? 0))->toArray();
        $dataCompleted = $days->map(fn ($d) => (int) ($completed[$d->format('Y-m-d')] ?? 0))->toArray();

        return [
            'datasets' => [
                [
                    'label'           => 'Создано',
                    'data'            => $dataAll,
                    'borderColor'     => 'rgba(244, 63, 94, 0.9)',
                    'backgroundColor' => 'rgba(244, 63, 94, 0.08)',
                    'fill'            => true,
                    'tension'         => 0.4,
                    'pointRadius'     => 3,
                ],
                [
                    'label'           => 'Завершено',
                    'data'            => $dataCompleted,
                    'borderColor'     => 'rgba(16, 185, 129, 0.9)',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.08)',
                    'fill'            => true,
                    'tension'         => 0.4,
                    'pointRadius'     => 3,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
