<?php

declare(strict_types=1);

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
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
        ];
    }
}
