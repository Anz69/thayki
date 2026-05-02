<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'telegram_id' => fake()->unique()->numberBetween(100_000_000, 999_999_999),
            'username' => fake()->userName(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'language_code' => 'en',
            'photo_url' => null,
            'role' => UserRole::Client,
            'status' => UserStatus::Active,
            'last_auth_at' => now(),
        ];
    }

    public function model(): static
    {
        return $this->state(fn () => ['role' => UserRole::Model]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => UserRole::Admin]);
    }

    public function banned(): static
    {
        return $this->state(fn () => ['status' => UserStatus::Banned]);
    }
}
