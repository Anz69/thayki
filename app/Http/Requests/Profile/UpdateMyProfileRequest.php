<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMyProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'min:1', 'max:80'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'language_code' => ['sometimes', 'nullable', 'string', 'max:8'],
            'notifications_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
