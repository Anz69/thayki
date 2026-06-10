<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ModelSchedule;
use App\Enums\UserRole;
use App\Models\ModelProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModelProfileFactory extends Factory
{
    protected $model = ModelProfile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['role' => UserRole::Model]),
            'display_name' => fake()->firstName('female'),
            'age' => fake()->numberBetween(19, 35),
            'height_cm' => fake()->numberBetween(155, 180),
            'weight_kg' => fake()->numberBetween(45, 65),
            'bust_size' => fake()->randomElement(['A', 'B', 'C', 'D']),
            'butt_size' => fake()->randomElement(['S', 'M', 'L']),
            'description' => fake()->paragraph(),
            'schedule' => fake()->randomElement(ModelSchedule::cases()),
            'hourly_rate_thb' => fake()->numberBetween(1500, 5000),
            'is_published' => true,
            'is_verified' => true,
            'published_at' => now(),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false, 'published_at' => null]);
    }
}
