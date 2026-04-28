<?php

namespace App\Filament\Resources\StartInviteResource\Pages;

use App\Filament\Resources\StartInviteResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Str;

class CreateStartInvite extends CreateRecord
{
    protected static string $resource = StartInviteResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        if (empty($data['token'])) {
            $data['token'] = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
        }
        $data['created_by_admin_id'] = auth()->id();
        $data['times_used'] = 0;
        return $data;
    }
}
