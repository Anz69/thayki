<?php

declare(strict_types=1);

namespace App\Http\Requests\ModelApplication;

use App\Enums\ModelSchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitModelApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'display_name' => ['required', 'string', 'min:1', 'max:80'],
            'age' => ['required', 'integer', 'min:18', 'max:99'],
            'height_cm' => ['required', 'integer', 'min:120', 'max:220'],
            'weight_kg' => ['required', 'integer', 'min:35', 'max:200'],
            'bust_size' => ['required', 'string', 'max:16'],
            'butt_size' => ['required', 'string', 'max:16'],
            'description' => ['nullable', 'string', 'max:4096'],
            'schedule' => ['required', 'string', Rule::in(array_map(fn (ModelSchedule $s) => $s->value, ModelSchedule::cases()))],
            'hourly_rate_thb' => ['required', 'integer', 'min:100', 'max:1000000'],
            'photos' => ['sometimes', 'array', 'max:10'],
            'photos.*' => ['string', 'max:1024'],
            'price_options' => ['sometimes', 'array', 'max:10'],
            'price_options.*.label' => ['required_with:price_options', 'string', 'max:32'],
            'price_options.*.hours' => ['required_with:price_options', 'integer', 'min:1'],
            'price_options.*.price_thb' => ['required_with:price_options', 'integer', 'min:1'],
            'contact' => ['sometimes', 'array'],
            'contact.phone' => ['sometimes', 'string', 'max:32'],
            'contact.telegram' => ['sometimes', 'string', 'max:64'],
        ];
    }
}
