<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModelProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ModelProfile
 */
class ModelProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'age' => $this->age,
            'height_cm' => $this->height_cm,
            'weight_kg' => $this->weight_kg,
            'bust_size' => $this->bust_size,
            'butt_size' => $this->butt_size,
            'description' => $this->description,
            'schedule' => $this->schedule->value,
            'hourly_rate_thb' => $this->hourly_rate_thb,
            'is_published' => $this->is_published,
            'is_verified' => $this->is_verified,
            'published_at' => $this->published_at?->toIso8601String(),
            'photos' => ModelPhotoResource::collection($this->whenLoaded('photos')),
            'price_options' => ModelPriceOptionResource::collection($this->whenLoaded('priceOptions')),
            // Expose just the avatar bits of the underlying user. Used by
            // MeetingPage to render the model's actual TG avatar instead of
            // falling back to the first media photo. Loaded conditionally
            // (whenLoaded) so it never N+1's a catalog list.
            'user' => $this->whenLoaded('user', fn () => [
                'id'        => $this->user->id,
                'photo_url' => $this->user->photo_url,
                // Kept in sync with display_name via the User/ModelProfile
                // observers (see App\Observers).
                'first_name' => $this->user->first_name,
            ]),
        ];
    }
}
