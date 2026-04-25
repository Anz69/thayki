<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModelPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ModelPhoto
 */
class ModelPhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => $this->getUrl(),
            'position' => $this->position,
            'is_main' => $this->is_main,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
