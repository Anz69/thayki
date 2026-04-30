<?php

namespace App\Filament\Resources\ModelResource\Pages;

use App\Enums\UserRole;
use App\Filament\Resources\ModelResource;
use Filament\Resources\Pages\CreateRecord;

class CreateModel extends CreateRecord
{
    protected static string $resource = ModelResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['role'] = UserRole::Model->value;
        return $data;
    }
}
