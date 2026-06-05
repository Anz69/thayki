<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Filament\Widgets\AccountWidget;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';

    protected static string $routePath = '/';

    protected static ?string $title = 'Обзор';

    /**
     * Widgets shown on this dashboard page in order.
     *
     * The legacy booking/revenue widgets (meetings, payments, platform
     * commission) were removed with the pivot to the lead-gen product.
     */
    public function getWidgets(): array
    {
        return [
            AccountWidget::class,
        ];
    }

    public function getColumns(): int|array
    {
        return 1;
    }
}
