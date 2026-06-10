<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'language_code' => $this->language_code,
            'language_chosen' => (bool) $this->language_chosen,
            'photo_url' => $this->photo_url,
            'photo_customized' => $this->photo_customized,
            'is_strange' => (bool) $this->is_strange,
            'notifications_enabled' => (bool) $this->notifications_enabled,
            'role' => $this->role->value,
            'status' => $this->status->value,
            'last_auth_at' => $this->last_auth_at?->toIso8601String(),
        ];
    }
}
