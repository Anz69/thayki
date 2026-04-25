<?php

namespace App\Filament\Resources\ModelApplicationResource\Pages;

use App\Filament\Resources\ModelApplicationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListModelApplications extends ListRecords
{
    protected static string $resource = ModelApplicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
