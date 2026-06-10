<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class LatestMeetingsTableWidget extends Widget
{
    protected static bool $isDiscovered = false;

    public static function canView(): bool
    {
        return false;
    }
}
