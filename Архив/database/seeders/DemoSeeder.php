<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\ModelPhoto;
use App\Models\ModelPriceOption;
use App\Models\ModelProfile;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'telegram_id' => 100_000_001,
            'first_name' => 'Admin',
            'last_name' => 'Root',
            'username' => 'admin',
        ]);
        Wallet::factory()->for($admin)->create();

        User::factory()
            ->count(10)
            ->model()
            ->create()
            ->each(function (User $user): void {
                Wallet::factory()->for($user)->create();
                $profile = ModelProfile::factory()->create(['user_id' => $user->id]);
                ModelPhoto::factory()->count(3)->create([
                    'model_profile_id' => $profile->id,
                ]);
                ModelPhoto::factory()->create([
                    'model_profile_id' => $profile->id,
                    'is_main' => true,
                    'position' => 0,
                ]);
                foreach ([[1, 2000, '1h'], [3, 5000, '3h'], [6, 9000, '6h'], [12, 15000, '12h']] as [$hours, $price, $label]) {
                    ModelPriceOption::query()->updateOrCreate(
                        ['model_profile_id' => $profile->id, 'hours' => $hours],
                        ['price_thb' => $price, 'label' => $label],
                    );
                }
            });

        User::factory()
            ->count(5)
            ->create(['role' => UserRole::Client])
            ->each(fn (User $u) => Wallet::factory()->for($u)->create());
    }
}
