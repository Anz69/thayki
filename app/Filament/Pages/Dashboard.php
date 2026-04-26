<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Widgets\LatestMeetingsWidget;
use App\Filament\Widgets\MeetingsChartWidget;
use App\Filament\Widgets\RevenueChartWidget;
use App\Filament\Widgets\StatsOverviewWidget;
use Filament\Pages\Dashboard as BaseDashboard;
use Filament\Widgets\AccountWidget;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';

    protected static string $routePath = '/';

    protected static ?string $title = 'Обзор';

    /** Widgets shown on this dashboard page in order. */
    public function getWidgets(): array
    {
        return [
            AccountWidget::class,
            StatsOverviewWidget::class,
            MeetingsChartWidget::class,
            RevenueChartWidget::class,
            LatestMeetingsWidget::class,
        ];
    }

    /** Two-column layout for charts side-by-side. */
    public function getColumns(): int|array
    {
        return [
            'default' => 1,
            'sm'      => 2,
            'xl'      => 2,
        ];
    }
}
