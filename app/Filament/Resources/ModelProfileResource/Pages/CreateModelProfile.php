<?php

namespace App\Filament\Resources\ModelProfileResource\Pages;

use App\Filament\Resources\ModelProfileResource;
use Filament\Resources\Pages\CreateRecord;

class CreateModelProfile extends CreateRecord
{
    protected static string $resource = ModelProfileResource::class;

    /**
     * Paths of photos uploaded in the create form, pulled out before the
     * ModelProfile is created (it has no `photo_files` column) and turned
     * into ModelPhoto rows afterwards.
     *
     * @var array<int, string>
     */
    protected array $photoFiles = [];

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $this->photoFiles = array_values(array_filter((array) ($data['photo_files'] ?? [])));
        unset($data['photo_files']);

        return $data;
    }

    protected function afterCreate(): void
    {
        $profile = $this->record;

        foreach ($this->photoFiles as $i => $path) {
            $profile->photos()->create([
                'disk' => 'public',
                'path' => $path,
                'position' => $i,
                'is_main' => $i === 0,
            ]);
        }
    }
}
