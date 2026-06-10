<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Meeting;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'meeting_id' => Meeting::factory(),
            'user_id' => User::factory(),
            'gateway' => 'manual',
            'method' => PaymentMethod::Usdt,
            'amount_minor' => 200_000,
            'currency' => 'THB',
            'wallet_address' => fake()->bothify('T##########'),
            'tx_hash' => null,
            'status' => PaymentStatus::Pending,
            'raw' => [],
        ];
    }
}
