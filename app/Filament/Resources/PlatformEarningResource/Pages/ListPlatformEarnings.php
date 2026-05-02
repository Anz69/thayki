<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlatformEarningResource\Pages;

use App\Filament\Resources\PlatformEarningResource;
use Filament\Resources\Pages\ListRecords;

class ListPlatformEarnings extends ListRecords
{
    protected static string $resource = PlatformEarningResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
