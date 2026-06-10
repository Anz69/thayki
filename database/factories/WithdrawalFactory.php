<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\WithdrawalStatus;
use App\Models\User;
use App\Models\Withdrawal;
use Illuminate\Database\Eloquent\Factories\Factory;

class WithdrawalFactory extends Factory
{
    protected $model = Withdrawal::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'amount_minor' => 100_000,
            'currency' => 'THB',
            'method' => PaymentMethod::Usdt,
            'wallet_address' => fake()->bothify('T##########'),
            'status' => WithdrawalStatus::Pending,
        ];
    }
}
