<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

/**
 * Disabled — replaced by `LatestMeetingsWidget` which is functionally
 * superior (translated status badges, click-through to edit screen,
 * since-format created_at). Kept as a hidden stub so the autodiscover
 * doesn't trip on a missing class if it was referenced elsewhere.
 */
class LatestMeetingsTableWidget extends Widget
{
    protected static bool $isDiscovered = false;

    public static function canView(): bool
    {
        return false;
    }
}
