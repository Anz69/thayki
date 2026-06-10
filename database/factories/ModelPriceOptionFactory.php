<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModelPriceOption;
use App\Models\ModelProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModelPriceOptionFactory extends Factory
{
    protected $model = ModelPriceOption::class;

    public function definition(): array
    {
        $hours = fake()->randomElement([1, 3, 6, 12]);

        return [
            'model_profile_id' => ModelProfile::factory(),
            'hours' => $hours,
            'price_thb' => match ($hours) {
                1 => 2000,
                3 => 5000,
                6 => 9000,
                12 => 15000,
                default => 2000,
            },
            'label' => sprintf('%dh', $hours),
        ];
    }
}
