<?php

declare(strict_types=1);

namespace App\Http\Requests\Complaints;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'body'       => ['nullable', 'string', 'max:4096'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $subject = (string) $this->input('subject', '');
            $body = trim((string) $this->input('body', ''));

            if ($subject === 'Жалоба после встречи' && mb_strlen($body) < 3) {
                $validator->errors()->add('body', 'Поле body должно содержать минимум 3 символа для жалобы.');
            }
        });
    }
}
