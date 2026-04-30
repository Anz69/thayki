<?php

namespace App\Filament\Resources\ModelResource\Pages;

use App\Filament\Resources\ModelResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditModel extends EditRecord
{
    protected static string $resource = ModelResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()->label('Удалить'),
        ];
    }
}
