<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModelProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ModelProfileResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'display_name_en' => $this->display_name_en,
            'age' => $this->age,
            'height_cm' => $this->height_cm,

            'bust_cm' => $this->bust_cm,
            'waist_cm' => $this->waist_cm,
            'hips_cm' => $this->hips_cm,
            'eyes' => $this->eyes,
            'breast_size' => $this->breast_size,

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
            'user' => $this->whenLoaded('user', fn () => [
                'id'        => $this->user->id,
                'photo_url' => $this->user->photo_url,
                'first_name' => $this->user->first_name,
            ]),
        ];
    }
}
