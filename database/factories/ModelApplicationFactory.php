<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ModelApplicationStatus;
use App\Models\ModelApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModelApplicationFactory extends Factory
{
    protected $model = ModelApplication::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'payload' => [
                'display_name' => fake()->firstName('female'),
                'age' => 24,
                'height_cm' => 170,
                'weight_kg' => 55,
                'bust_size' => 'C',
                'butt_size' => 'M',
                'description' => fake()->paragraph(),
                'schedule' => 'any',
                'hourly_rate_thb' => 2500,
            ],
            'status' => ModelApplicationStatus::Draft,
        ];
    }

    public function submitted(): static
    {
        return $this->state(fn () => ['status' => ModelApplicationStatus::Submitted]);
    }
}
