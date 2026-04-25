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
        $userId = (int) ($this->user()?->id ?? 0);

        return [
            // Meeting must exist *and* belong to the requesting user.
            // CreatePaymentAction enforces this again as defence-in-depth, but
            // catching it here returns a clearer 422 instead of a 403.
            'meeting_id' => [
                'required',
                'integer',
                Rule::exists('meetings', 'id')->where('client_id', $userId),
            ],
            'method' => ['required', 'string', Rule::in(array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases()))],
        ];
    }
}
