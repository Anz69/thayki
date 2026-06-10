<?php

namespace App\Filament\Resources\ManagerResource\Pages;

use App\Enums\UserRole;
use App\Filament\Resources\ManagerResource;
use Filament\Resources\Pages\CreateRecord;

class CreateManager extends CreateRecord
{
    protected static string $resource = ManagerResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['role'] = UserRole::Manager->value;

        return $data;
    }
}
