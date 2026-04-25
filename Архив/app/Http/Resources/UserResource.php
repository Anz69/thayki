<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'telegram_id' => $this->telegram_id,
            'username' => $this->username,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'language_code' => $this->language_code,
            'photo_url' => $this->photo_url,
            'photo_customized' => $this->photo_customized,
            'is_premium' => $this->is_premium,
            'role' => $this->role->value,
            'status' => $this->status->value,
            'last_auth_at' => $this->last_auth_at?->toIso8601String(),
        ];
    }
}
