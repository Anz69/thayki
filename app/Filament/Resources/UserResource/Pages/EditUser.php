<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Enums\WalletTransactionType;
use App\Filament\Resources\UserResource;
use App\Models\Wallet;
use App\Services\Audit\AuditLogger;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $wallet = $this->record->wallet;
        $data['wallet_balance_thb'] = number_format(((int) ($wallet?->balance_minor ?? 0)) / 100, 2, '.', '');
        $data['wallet_locked_thb'] = number_format(((int) ($wallet?->locked_minor ?? 0)) / 100, 2, '.', '');

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        $newBalanceMinor = (int) round(((float) ($data['wallet_balance_thb'] ?? 0)) * 100);
        $newLockedMinor  = (int) round(((float) ($data['wallet_locked_thb'] ?? 0)) * 100);

        /** @var \App\Models\AdminUser $admin */
        $admin = auth()->user();

        DB::transaction(function () use ($newBalanceMinor, $newLockedMinor, $admin): void {
            /** @var Wallet $wallet */
            $wallet = $this->record->wallet()->lockForUpdate()->firstOrCreate(
                [],
                ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
            );

            $prevBalance = (int) $wallet->balance_minor;
            $prevLocked  = (int) $wallet->locked_minor;

            $wallet->update([
                'balance_minor' => $newBalanceMinor,
                'locked_minor'  => $newLockedMinor,
                'version'       => ((int) $wallet->version) + 1,
            ]);

            app(AuditLogger::class)->log('admin.wallet.adjusted', $admin, $wallet, [
                'user_id'          => $this->record->id,
                'prev_balance'     => $prevBalance,
                'new_balance'      => $newBalanceMinor,
                'prev_locked'      => $prevLocked,
                'new_locked'       => $newLockedMinor,
            ]);
        });

        return Arr::except($data, ['wallet_balance_thb', 'wallet_locked_thb']);
    }
}
