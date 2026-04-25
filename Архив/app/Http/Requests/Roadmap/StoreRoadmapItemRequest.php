<?php

declare(strict_types=1);

namespace App\Http\Requests\Roadmap;

use App\Enums\RoadmapStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoadmapItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $isUpdate = $this->route('item') !== null;

        return [
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:4096'],
            'status' => [$isUpdate ? 'sometimes' : 'required', 'string', Rule::in(array_map(fn (RoadmapStatus $s) => $s->value, RoadmapStatus::cases()))],
            'position' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
