<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginTelegramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'init_data'     => ['required', 'string', 'min:10', 'max:8192'],
            'browser_token' => ['sometimes', 'nullable', 'string', 'max:128'],
            'invite_token'  => ['sometimes', 'nullable', 'string', 'max:128'],
        ];
    }
}
