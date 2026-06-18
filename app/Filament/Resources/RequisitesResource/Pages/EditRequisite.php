<?php

namespace App\Filament\Resources\RequisitesResource\Pages;

use App\Filament\Resources\RequisitesResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditRequisite extends EditRecord
{
    protected static string $resource = RequisitesResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
