<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\RoadmapStatus;
use App\Models\RoadmapItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoadmapItemFactory extends Factory
{
    protected $model = RoadmapItem::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'status' => RoadmapStatus::Planned,
            'position' => fake()->numberBetween(0, 100),
        ];
    }
}
