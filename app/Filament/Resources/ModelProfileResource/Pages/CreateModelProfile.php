<?php

namespace App\Filament\Resources\ModelProfileResource\Pages;

use App\Filament\Resources\ModelProfileResource;
use Filament\Resources\Pages\CreateRecord;

class CreateModelProfile extends CreateRecord
{
    protected static string $resource = ModelProfileResource::class;

    protected array $photoFiles = [];

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $this->photoFiles = array_values((array) ($data['photo_files'] ?? []));
        unset($data['photo_files']);

        return $data;
    }

    protected function afterCreate(): void
    {
        ModelProfileResource::syncPhotos($this->record, $this->photoFiles);
    }
}
