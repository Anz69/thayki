<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModelPhoto;
use App\Models\ModelProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModelPhoto>
 */
class ModelPhotoFactory extends Factory
{
    protected $model = ModelPhoto::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'model_profile_id' => ModelProfile::factory(),
            'disk' => 'public_web',
            'path' => 'img/girls/big/'.fake()->numberBetween(1, 6).'.png',
            'position' => 0,
            'is_main' => false,
            'width' => 1080,
            'height' => 1440,
        ];
    }
}
