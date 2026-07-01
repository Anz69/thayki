<?php

namespace App\Filament\Resources\TemplateCategoryResource\Pages;

use App\Filament\Resources\TemplateCategoryResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListTemplateCategories extends ListRecords
{
    protected static string $resource = TemplateCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()->label('Добавить категорию')];
    }
}
