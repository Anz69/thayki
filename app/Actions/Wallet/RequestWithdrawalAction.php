<?php

declare(strict_types=1);

namespace App\Actions\Wallet;

use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Enums\WalletTransactionType;
use App\Enums\WithdrawalStatus;
use App\Exceptions\DomainException;
use App\Models\AppSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Services\Audit\AuditLogger;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;

class RequestWithdrawalAction
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(User $user, int $amountMinor, PaymentMethod $method, string $walletAddress): Withdrawal
    {
        if ($user->role !== UserRole::Model) {
            throw DomainException::forbidden('WITHDRAWAL_FORBIDDEN', 'Only models can request withdrawals.');
        }

        $minMinor = (int) (((float) config('payments.min_withdrawal', 100)) * 100);
        if ($amountMinor < $minMinor) {
            throw DomainException::invalid('WITHDRAWAL_MIN_AMOUNT', "Minimum withdrawal amount is {$minMinor} minor units.");
        }

        $allowedMethods = $this->resolveAllowedWithdrawalMethods();
        if (! in_array($method, $allowedMethods, true)) {
            throw DomainException::invalid('WITHDRAWAL_METHOD_NOT_ALLOWED', 'Selected withdrawal method is not available.');
        }

        return DB::transaction(function () use ($user, $amountMinor, $method, $walletAddress): Withdrawal {
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
                'method' => $method,
                'wallet_address' => $walletAddress,
                'status' => WithdrawalStatus::Pending,
            ]);

            $this->wallets->debit(
                user: $user,
                amountMinor: $amountMinor,
                type: WalletTransactionType::DebitWithdraw,
                referenceType: Withdrawal::class,
                referenceId: $withdrawal->id,
                meta: ['method' => $method->value, 'wallet_address' => $walletAddress],
            );

            $this->audit->log('withdrawal.requested', $user, $withdrawal, [
                'amount_minor' => $amountMinor,
                'method' => $method->value,
            ]);

            return $withdrawal->refresh();
        });
    }

    /**
     * @return list<PaymentMethod>
     */
    private function resolveAllowedWithdrawalMethods(): array
    {
        $default = implode(',', array_map(
            static fn (PaymentMethod $method): string => $method->value,
            PaymentMethod::withdrawalDefaults()
        ));

        $raw = (string) AppSetting::get('withdrawal_methods', $default);
        $parts = array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', $raw)
        ));

        $methods = [];
        foreach ($parts as $part) {
            $enum = PaymentMethod::tryFrom($part);
            if ($enum !== null && $enum !== PaymentMethod::Manual) {
                $methods[] = $enum;
            }
        }

        return $methods !== [] ? $methods : PaymentMethod::withdrawalDefaults();
    }
}
