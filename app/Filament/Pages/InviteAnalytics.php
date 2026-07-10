<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Widgets\InviteLatestOrdersWidget;
use App\Filament\Widgets\InviteOrdersChartWidget;
use App\Filament\Widgets\InviteStatsOverviewWidget;
use App\Filament\Widgets\InviteUsersPieChartWidget;
use Filament\Pages\Page;

class InviteAnalytics extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-pie';

    protected static ?string $navigationGroup = 'Система';

    protected static ?string $navigationLabel = 'Аналитика ссылок';

    protected static ?string $title = 'Аналитика invite-ссылок';

    protected static ?int $navigationSort = 2;

    protected static string $view = 'filament.pages.invite-analytics';

    protected function getHeaderWidgets(): array
    {
        return [
            InviteStatsOverviewWidget::class,
            InviteOrdersChartWidget::class,
            InviteUsersPieChartWidget::class,
            InviteLatestOrdersWidget::class,
        ];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }
}
