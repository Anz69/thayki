<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use App\Enums\ModelSchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateModelProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($user = $this->user()) !== null && $user->isModel();
    }

    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'string', 'min:1', 'max:80'],
            'age' => ['sometimes', 'integer', 'min:18', 'max:99'],
            'height_cm' => ['sometimes', 'integer', 'min:120', 'max:220'],
            'weight_kg' => ['sometimes', 'integer', 'min:35', 'max:200'],
            'bust_size' => ['sometimes', 'string', 'max:16'],
            'butt_size' => ['sometimes', 'string', 'max:16'],
            'description' => ['sometimes', 'nullable', 'string', 'max:4096'],
            'schedule' => ['sometimes', 'string', Rule::in(array_map(fn (ModelSchedule $s) => $s->value, ModelSchedule::cases()))],
            'hourly_rate_thb'           => ['sometimes', 'integer', 'min:100', 'max:1000000'],
            'price_options'             => ['sometimes', 'array', 'max:12'],
            'price_options.*.hours'     => ['required_with:price_options', 'integer', 'min:1', 'max:24'],
            'price_options.*.price_thb' => ['required_with:price_options', 'integer', 'min:100', 'max:10000000'],
            'price_options.*.label'     => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
