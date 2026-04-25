<?php

declare(strict_types=1);

namespace App\Http\Requests\Payment;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePaymentRequest extends FormRequest
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
            'meeting_id' => ['required', 'integer', 'exists:meetings,id'],
            'method' => ['required', 'string', Rule::in(array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases()))],
        ];
    }
}
