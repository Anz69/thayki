<?php

declare(strict_types=1);

namespace App\Actions\ModelApplication;

use App\Enums\ModelApplicationStatus;
use App\Enums\ModelSchedule;
use App\Enums\UserRole;
use App\Exceptions\DomainException;
use App\Models\ModelApplication;
use App\Models\ModelPhoto;
use App\Models\ModelPriceOption;
use App\Models\ModelProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Audit\AuditLogger;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ApproveModelApplicationAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly Notifier $notifier,
    ) {}

    public function execute(ModelApplication $application, ?User $reviewer = null): ModelApplication
    {
        if ($application->status !== ModelApplicationStatus::Submitted) {
            throw DomainException::conflict('APPLICATION_NOT_SUBMITTED', 'Only submitted applications can be approved.');
        }

        $application = DB::transaction(function () use ($application, $reviewer): ModelApplication {
            $user = $application->user()->lockForUpdate()->firstOrFail();

            $payload = $application->payload;

            $profile = ModelProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'display_name' => (string) $payload['display_name'],
                    'age' => (int) $payload['age'],
                    'height_cm' => (int) $payload['height_cm'],
                    'weight_kg' => (int) $payload['weight_kg'],
                    'bust_size' => (string) $payload['bust_size'],
                    'butt_size' => (string) $payload['butt_size'],
                    'description' => isset($payload['description']) ? (string) $payload['description'] : null,
                    'schedule' => ModelSchedule::from((string) $payload['schedule']),
                    'hourly_rate_thb' => (int) $payload['hourly_rate_thb'],
                    'is_published' => true,
                    'is_verified' => true,
                    'published_at' => now(),
                ],
            );

            $photos = array_values(array_filter((array) ($payload['photos'] ?? [])));
            if (count($photos) > 0) {
                $profile->photos()->delete();
                foreach ($photos as $idx => $path) {
                    ModelPhoto::create([
                        'model_profile_id' => $profile->id,
                        'disk' => 'public',
                        'path' => ltrim((string) $path, '/'),
                        'position' => $idx,
                        'is_main' => $idx === 0,
                    ]);
                }
            }

            $priceOptions = (array) ($payload['price_options'] ?? []);
            if (count($priceOptions) > 0) {
                $profile->priceOptions()->delete();
                foreach ($priceOptions as $option) {
                    ModelPriceOption::create([
                        'model_profile_id' => $profile->id,
                        'label' => (string) ($option['label'] ?? ''),
                        'hours' => (int) ($option['hours'] ?? 1),
                        'price_thb' => (int) ($option['price_thb'] ?? 0),
                    ]);
                }
            }

            $firstPhotoPath = $photos[0] ?? null;
            $avatarUrl = null;
            if ($firstPhotoPath !== null && $firstPhotoPath !== '') {
                $clean = ltrim((string) $firstPhotoPath, '/');
                $avatarUrl = str_starts_with($clean, 'http') ? $clean : Storage::disk('public')->url($clean);
            }
            $userPatch = [
                'role' => UserRole::Model,
                'is_strange' => false,
            ];
            if ($avatarUrl !== null) {
                $userPatch['photo_url'] = $avatarUrl;
            }
            $user->update($userPatch);

            Wallet::query()->firstOrCreate(['user_id' => $user->id], [
                'balance_minor' => 0,
                'locked_minor' => 0,
                'currency' => 'THB',
                'version' => 0,
            ]);

            $application->update([
                'status' => ModelApplicationStatus::Approved,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => now(),
            ]);

            $this->audit->log('model_application.approved', $reviewer, $application, [
                'profile_id' => $profile->id,
                'user_id' => $user->id,
            ]);

            return $application->refresh();
        });

        $user = $application->user;
        if ($user !== null) {
            $this->notifier->notifyUser(
                $user,
                '✅ Заявка модели одобрена! Профиль активирован, можно принимать бронирования.',
                '/home',
                'Открыть профиль',
            );
        }
        $this->notifier->notifyAdmins(
            "✅ Заявка модели #{$application->id} одобрена.",
            '/admin/model-applications',
            'Открыть в админке',
        );

        return $application;
    }
}
