<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\StartInvite;
use Filament\Widgets\ChartWidget;

class InviteOrdersChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Заказов по ссылкам (топ-10)';

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected static ?string $maxHeight = '280px';

    protected function getData(): array
    {
        $invites = StartInvite::query()
            ->withCount('leads')
            ->orderByDesc('leads_count')
            ->limit(10)
            ->get();

        $labels = $invites->map(fn (StartInvite $i): string => $this->inviteLabel($i))->toArray();
        $data = $invites->pluck('leads_count')->map(fn ($n) => (int) $n)->toArray();

        return [
            'datasets' => [[
                'label' => 'Заказов',
                'data' => $data,
                'backgroundColor' => 'rgba(226, 49, 155, 0.75)',
                'borderColor' => '#E2319B',
                'borderWidth' => 1,
                'borderRadius' => 6,
            ]],
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
            'plugins' => ['legend' => ['display' => false]],
            'scales' => ['y' => ['beginAtZero' => true, 'ticks' => ['precision' => 0]]],
        ];
    }

    private function inviteLabel(StartInvite $invite): string
    {
        $name = $invite->label ?: ('#'.$invite->id);

        return mb_strlen($name) > 22 ? mb_substr($name, 0, 21).'…' : $name;
    }
}
