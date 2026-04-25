<?php

declare(strict_types=1);

namespace App\Http\Requests\Wallet;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestWithdrawalRequest extends FormRequest
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
            'amount_minor' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'string', Rule::in(array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases()))],
            'wallet_address' => ['required', 'string', 'max:255'],
        ];
    }
}
