<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UploadModelPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($user = $this->user()) !== null && $user->isModel();
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'file', 'max:10240'],
            'is_main' => ['sometimes', 'boolean'],
        ];
    }
}
