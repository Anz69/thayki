<?php

declare(strict_types=1);

namespace App\Actions\Wallet;

use App\Enums\WalletTransactionType;
use App\Enums\WithdrawalStatus;
use App\Exceptions\DomainException;
use App\Models\AdminUser;
use App\Models\User;
use App\Models\Withdrawal;
use App\Services\Audit\AuditLogger;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;

/**
 * Admin-side workflow for processing withdrawals: approve, mark paid, or reject.
 * Rejecting a withdrawal returns the held funds to the wallet.
 */
class ProcessWithdrawalAction
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly AuditLogger $audit,
    ) {}

    public function approve(Withdrawal $withdrawal, User|AdminUser|null $admin = null): Withdrawal
    {
        return $this->transition($withdrawal, $admin, WithdrawalStatus::Approved, null);
    }

    public function markPaid(Withdrawal $withdrawal, User|AdminUser|null $admin = null): Withdrawal
    {
        return $this->transition($withdrawal, $admin, WithdrawalStatus::Paid, null);
    }

    public function reject(Withdrawal $withdrawal, User|AdminUser|null $admin = null, ?string $note = null): Withdrawal
    {
        return DB::transaction(function () use ($withdrawal, $admin, $note): Withdrawal {
            /** @var Withdrawal $withdrawal */
            $withdrawal = Withdrawal::query()->whereKey($withdrawal->id)->lockForUpdate()->firstOrFail();

            if (! in_array($withdrawal->status, [WithdrawalStatus::Pending, WithdrawalStatus::Approved], true)) {
                throw DomainException::conflict('WITHDRAWAL_INVALID_STATE', 'Cannot reject withdrawal in state '.$withdrawal->status->value);
            }

            $withdrawal->update([
                'status' => WithdrawalStatus::Rejected,
                'processed_by' => $this->resolveProcessedById($admin),
                'processed_at' => now(),
                'admin_note' => $note,
            ]);

            $owner = $withdrawal->user()->firstOrFail();
            $this->wallets->credit(
                user: $owner,
                amountMinor: (int) $withdrawal->amount_minor,
                type: WalletTransactionType::Adjustment,
                referenceType: Withdrawal::class.':refund',
                referenceId: $withdrawal->id,
                meta: ['reason' => 'withdrawal_rejected'],
            );

            $this->audit->log('withdrawal.rejected', $this->resolveAuditActor($admin), $withdrawal, ['note' => $note]);

            return $withdrawal->refresh();
        });
    }

    private function transition(Withdrawal $withdrawal, User|AdminUser|null $admin, WithdrawalStatus $next, ?string $note): Withdrawal
    {
        return DB::transaction(function () use ($withdrawal, $admin, $next, $note): Withdrawal {
            /** @var Withdrawal $withdrawal */
            $withdrawal = Withdrawal::query()->whereKey($withdrawal->id)->lockForUpdate()->firstOrFail();

            $allowed = match ($next) {
                WithdrawalStatus::Approved => [WithdrawalStatus::Pending],
                WithdrawalStatus::Paid => [WithdrawalStatus::Approved],
                default => [],
            };

            if (! in_array($withdrawal->status, $allowed, true)) {
                throw DomainException::conflict('WITHDRAWAL_INVALID_STATE', "Cannot transition withdrawal from {$withdrawal->status->value} to {$next->value}.");
            }

            $withdrawal->update([
                'status' => $next,
                'processed_by' => $this->resolveProcessedById($admin),
                'processed_at' => now(),
                'admin_note' => $note,
            ]);

            $this->audit->log('withdrawal.'.$next->value, $this->resolveAuditActor($admin), $withdrawal, []);

            return $withdrawal->refresh();
        });
    }

    private function resolveProcessedById(User|AdminUser|null $admin): ?int
    {
        return $admin instanceof User ? $admin->id : null;
    }

    private function resolveAuditActor(User|AdminUser|null $admin): ?User
    {
        return $admin instanceof User ? $admin : null;
    }
}
