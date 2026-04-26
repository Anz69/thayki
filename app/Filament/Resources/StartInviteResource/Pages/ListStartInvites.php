<?php

namespace App\Filament\Resources\StartInviteResource\Pages;

use App\Filament\Resources\StartInviteResource;
use Filament\Pages\Actions;
use Filament\Resources\Pages\ListRecords;

class ListStartInvites extends ListRecords
{
    protected static string $resource = StartInviteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('Создать ссылку'),
        ];
    }
}
