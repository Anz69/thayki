<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MeetingFactory extends Factory
{
    protected $model = Meeting::class;

    public function definition(): array
    {
        return [
            'client_id' => User::factory(),
            'model_profile_id' => ModelProfile::factory(),
            'scheduled_at' => now()->addDays(2),
            'duration_hours' => 1,
            'price_thb' => 2000,
            'status' => MeetingStatus::Pending,
        ];
    }

    public function status(MeetingStatus $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
