<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class PostMessageRequest extends FormRequest
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
            'body' => ['nullable', 'string', 'max:4096'],
            'attachment' => ['sometimes', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf,mp4,mp3,ogg,wav'],
        ];
    }
}
