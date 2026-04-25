<?php

declare(strict_types=1);

namespace App\Http\Requests\Catalog;

use App\Enums\ModelSchedule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListModelsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string|ValidationRule>>
     */
    public function rules(): array
    {
        return [
            'schedule' => ['sometimes', 'string', Rule::in(array_map(fn (ModelSchedule $s) => $s->value, ModelSchedule::cases()))],
            'price_min' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'price_max' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'age_min' => ['sometimes', 'integer', 'min:18', 'max:99'],
            'age_max' => ['sometimes', 'integer', 'min:18', 'max:99'],
            'search' => ['sometimes', 'string', 'max:120'],
            'sort' => ['sometimes', 'string', Rule::in([
                'price', '-price',
                'age', '-age',
                'newest', '-newest',
            ])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
