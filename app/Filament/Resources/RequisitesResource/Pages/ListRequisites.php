<?php

namespace App\Filament\Resources\RequisitesResource\Pages;

use App\Filament\Resources\RequisitesResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListRequisites extends ListRecords
{
    protected static string $resource = RequisitesResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('Добавить реквизиты'),
        ];
    }
}
