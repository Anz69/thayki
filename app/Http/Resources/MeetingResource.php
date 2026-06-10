<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeetingResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'model_profile_id' => $this->model_profile_id,
            'scheduled_at' => $this->scheduled_at->toIso8601String(),
            'duration_hours' => $this->duration_hours,
            'price_thb' => $this->price_thb,
            'status' => $this->status->value,
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'cancel_reason' => $this->cancel_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'model_profile' => $this->whenLoaded('modelProfile', fn () => new ModelProfileResource($this->modelProfile)),
            'client' => $this->whenLoaded('client', fn () => new UserResource($this->client)),
        ];
    }
}
