<?php

declare(strict_types=1);

namespace App\Http\Requests\Complaints;

use Illuminate\Foundation\Http\FormRequest;

class StoreComplaintRequest extends FormRequest
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
        return [
            'meeting_id' => ['nullable', 'integer', 'exists:meetings,id'],
            'subject'    => ['nullable', 'string', 'max:255'],
            'body'       => ['required', 'string', 'min:3', 'max:4096'],
        ];
    }
}
