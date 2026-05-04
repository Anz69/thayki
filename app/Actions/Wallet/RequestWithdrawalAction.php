<?php

declare(strict_types=1);

namespace App\Actions\Wallet;

use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Enums\WalletTransactionType;
use App\Enums\WithdrawalStatus;
use App\Exceptions\DomainException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Services\Audit\AuditLogger;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;

/**
 * Creates a new withdrawal request and locks the matching balance on the
 * model's wallet. The user-facing flow now collects ONLY an amount — payout
 * coordination (where to send the money) happens out-of-band via support chat
 * after the admin sees the request in Filament.
 *
 * Behind the scenes we still write `method=manual` and `wallet_address='—'`
 * so the existing Withdrawal schema stays unchanged.
 */
class RequestWithdrawalAction
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(User $user, int $amountMinor): Withdrawal
    {
        if ($user->role !== UserRole::Model) {
            throw DomainException::forbidden('WITHDRAWAL_FORBIDDEN', 'Only models can request withdrawals.');
        }

        $minMinor = (int) (((float) config('payments.min_withdrawal', 100)) * 100);
        if ($amountMinor < $minMinor) {
            throw DomainException::invalid('WITHDRAWAL_MIN_AMOUNT', "Minimum withdrawal amount is {$minMinor} minor units.");
        }

        $hasPending = Withdrawal::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [WithdrawalStatus::Pending->value, WithdrawalStatus::Approved->value])
            ->exists();

        if ($hasPending) {
            throw DomainException::conflict(
                'PENDING_WITHDRAWAL_EXISTS',
                'У вас уже есть заявка на вывод в обработке. Пожалуйста, дождитесь её завершения.',
            );
        }

        return DB::transaction(function () use ($user, $amountMinor): Withdrawal {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($wallet->availableBalance() < $amountMinor) {
                throw DomainException::invalid('INSUFFICIENT_FUNDS', 'Insufficient available balance.');
            }

            /** @var Withdrawal $withdrawal */
            $withdrawal = Withdrawal::query()->create([
                'user_id' => $user->id,
                'amount_minor' => $amountMinor,
                'currency' => $wallet->currency,
                'method' => PaymentMethod::Manual,
                'wallet_address' => '—',
                'status' => WithdrawalStatus::Pending,
            ]);

            $this->wallets->debit(
                user: $user,
                amountMinor: $amountMinor,
                type: WalletTransactionType::DebitWithdraw,
                referenceType: Withdrawal::class,
                referenceId: $withdrawal->id,
                meta: ['method' => PaymentMethod::Manual->value],
            );

            $this->audit->log('withdrawal.requested', $user, $withdrawal, [
                'amount_minor' => $amountMinor,
            ]);

            return $withdrawal->refresh();
        });
    }
}
