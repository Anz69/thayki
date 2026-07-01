<?php

namespace App\Filament\Resources\TemplateCategoryResource\Pages;

use App\Filament\Resources\TemplateCategoryResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditTemplateCategory extends EditRecord
{
    protected static string $resource = TemplateCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()->label('Удалить')];
    }
}
