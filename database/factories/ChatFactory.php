<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ChatType;
use App\Models\Chat;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChatFactory extends Factory
{
    protected $model = Chat::class;

    public function definition(): array
    {
        return [
            'type' => ChatType::Support,
            'meeting_id' => null,
        ];
    }
}
