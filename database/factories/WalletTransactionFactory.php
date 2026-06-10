<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\WalletTransactionType;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

class WalletTransactionFactory extends Factory
{
    protected $model = WalletTransaction::class;

    public function definition(): array
    {
        return [
            'wallet_id' => Wallet::factory(),
            'type' => WalletTransactionType::Adjustment,
            'amount_minor' => 0,
            'reference_type' => null,
            'reference_id' => null,
            'meta' => null,
        ];
    }
}
