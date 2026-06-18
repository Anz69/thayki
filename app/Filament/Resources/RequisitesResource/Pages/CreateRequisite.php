<?php

namespace App\Filament\Resources\RequisitesResource\Pages;

use App\Enums\UserRole;
use App\Filament\Resources\RequisitesResource;
use Filament\Resources\Pages\CreateRecord;

class CreateRequisite extends CreateRecord
{
    protected static string $resource = RequisitesResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['role'] = UserRole::Requisite->value;

        return $data;
    }
}
