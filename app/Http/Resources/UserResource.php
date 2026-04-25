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
     *
     * Notes
     * - `telegram_id` is intentionally NOT exposed publicly. It is the user's
     *   primary external identifier and leaking it would let third parties
     *   correlate accounts across services. Only the authenticated owner may
     *   see their own telegram_id (via /auth/me with `?include=telegram_id`,
     *   if ever needed) — which we do NOT enable by default.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
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
