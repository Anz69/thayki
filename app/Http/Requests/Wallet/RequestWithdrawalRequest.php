<?php

declare(strict_types=1);

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Simplified withdrawal request — the user submits only an amount. Method
 * and wallet details are no longer collected up-front; the admin coordinates
 * the actual payout through the support chat (see WithdrawalResource's
 * "Написать юзеру в чат как саппорт" action).
 */
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
        ];
    }
}
