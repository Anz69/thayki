<?php

declare(strict_types=1);

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {

        $user = $this->user();

        return $user === null || ! $user->isManager();
    }

    public function rules(): array
    {
        return [
            'model_profile_id' => ['nullable', 'integer', 'exists:model_profiles,id'],
            'city' => ['required', 'string', 'max:120'],
            'hair_type' => ['nullable', 'string', 'max:64'],
            'age_range' => ['nullable', 'string', 'max:32'],
            'height_range' => ['nullable', 'string', 'max:32'],
            'goal' => ['nullable', 'string', 'max:64'],
            'wishes' => ['nullable', 'string', 'max:4096'],
            'message' => ['nullable', 'string', 'max:4096'],
            'locale' => ['nullable', 'string', 'in:ru,en,zh'],

            'age_from' => ['nullable', 'integer', 'min:18', 'max:99'],
            'age_to' => ['nullable', 'integer', 'min:18', 'max:99'],
            'height_from' => ['nullable', 'integer', 'min:120', 'max:220'],
            'height_to' => ['nullable', 'integer', 'min:120', 'max:220'],
            'bust_type' => ['nullable', 'string', 'in:natural,silicone'],
            'bust_size' => ['nullable', 'string', 'max:8'],
            'weight_from' => ['nullable', 'integer', 'min:30', 'max:200'],
            'weight_to' => ['nullable', 'integer', 'min:30', 'max:200'],
            'figure' => ['nullable', 'string', 'max:24'],
            'hips' => ['nullable', 'string', 'in:narrow,medium,wide'],
            'event_type' => ['nullable', 'string', 'in:one_time,trip,relationship'],
            'event_hours_from' => ['nullable', 'integer', 'min:1', 'max:24'],
            'event_hours_to' => ['nullable', 'integer', 'min:1', 'max:24'],
            'trip_days_from' => ['nullable', 'integer', 'min:1', 'max:60'],
            'trip_days_to' => ['nullable', 'integer', 'min:1', 'max:60'],
            'trip_city' => ['nullable', 'string', 'max:120'],
            'trip_purpose' => ['nullable', 'string', 'in:leisure,business,event,companion'],
        ];
    }
}
