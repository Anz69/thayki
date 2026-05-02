<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UploadAvatarRequest extends FormRequest
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
            // Type checks run in UploadAvatarAction (incl. HEIC by extension / sniffed mime).
            'photo' => ['required', 'file', 'max:10240'],
        ];
    }
}
