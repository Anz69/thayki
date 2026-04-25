<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ChatParticipantRole;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatParticipant>
 */
class ChatParticipantFactory extends Factory
{
    protected $model = ChatParticipant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'chat_id' => Chat::factory(),
            'user_id' => User::factory(),
            'role' => ChatParticipantRole::Client,
            'last_read_at' => null,
        ];
    }
}
