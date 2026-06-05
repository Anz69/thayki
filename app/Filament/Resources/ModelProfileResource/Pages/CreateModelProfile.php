<?php

namespace App\Filament\Resources\ModelProfileResource\Pages;

use App\Filament\Resources\ModelProfileResource;
use Filament\Resources\Pages\CreateRecord;

class CreateModelProfile extends CreateRecord
{
    protected static string $resource = ModelProfileResource::class;

    /**
     * Ordered photo paths pulled out of the form before the ModelProfile is
     * created (it has no `photo_files` column) and synced into ModelPhoto rows.
     *
     * @var list<string>
     */
    protected array $photoFiles = [];

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
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
