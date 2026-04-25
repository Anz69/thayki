<?php

declare(strict_types=1);

namespace App\Services\Wallet;

use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * Centralized, idempotent wallet mutations. All callers MUST go through this
 * service so that balances, locked amounts, optimistic locking and audit
 * transactions remain consistent.
 */
class WalletService
{
    /**
     * Credit wallet and record a transaction; idempotent by (reference_type, reference_id, type).
     *
     * @param  array<string, mixed>  $meta
     */
    public function credit(
        User $user,
        int $amountMinor,
        WalletTransactionType $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        array $meta = [],
    ): WalletTransaction {
        return DB::transaction(function () use ($user, $amountMinor, $type, $referenceType, $referenceId, $meta): WalletTransaction {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()->where('user_id', $user->id)->lockForUpdate()->firstOrCreate(
                ['user_id' => $user->id],
                ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
            );

            if ($referenceType !== null && $referenceId !== null) {
                /** @var WalletTransaction|null $existing */
                $existing = WalletTransaction::query()
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('type', $type)
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            $wallet->update([
                'balance_minor' => $wallet->balance_minor + $amountMinor,
                'version' => $wallet->version + 1,
            ]);

            return WalletTransaction::query()->create([
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount_minor' => $amountMinor,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'meta' => $meta,
            ]);
        });
    }

    /**
     * Debit wallet with optimistic lock. Throws if balance would go negative
     * or the version changes between read and update.
     *
     * @param  array<string, mixed>  $meta
     */
    public function debit(
        User $user,
        int $amountMinor,
        WalletTransactionType $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        array $meta = [],
    ): WalletTransaction {
        return DB::transaction(function () use ($user, $amountMinor, $type, $referenceType, $referenceId, $meta): WalletTransaction {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($wallet->availableBalance() < $amountMinor) {
                throw new DomainException('INSUFFICIENT_FUNDS', 'Insufficient balance.', 422);
            }

            $updated = Wallet::query()
                ->where('id', $wallet->id)
                ->where('version', $wallet->version)
                ->update([
                    'balance_minor' => $wallet->balance_minor - $amountMinor,
                    'version' => $wallet->version + 1,
                ]);

            if ($updated !== 1) {
                throw new DomainException('WALLET_CONFLICT', 'Wallet was modified concurrently. Retry.', 409);
            }

            return WalletTransaction::query()->create([
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount_minor' => -$amountMinor,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'meta' => $meta,
            ]);
        });
    }
}
