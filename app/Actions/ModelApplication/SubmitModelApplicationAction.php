<?php

declare(strict_types=1);

namespace App\Actions\ModelApplication;

use App\Enums\MeetingStatus;
use App\Enums\ModelApplicationStatus;
use App\Enums\UserRole;
use App\Exceptions\DomainException;
use App\Models\Meeting;
use App\Models\ModelApplication;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SubmitModelApplicationAction
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly Notifier $notifier,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function execute(User $user, array $payload): ModelApplication
    {
        if ($user->role === UserRole::Admin) {
            throw DomainException::forbidden('APPLICATION_NOT_ALLOWED', 'Admins cannot submit model applications.');
        }

        $blockingStatuses = [
            MeetingStatus::Pending,
            MeetingStatus::Accepted,
            MeetingStatus::Paid,
            MeetingStatus::Confirmed,
        ];
        if (Meeting::query()
            ->where('client_id', $user->id)
            ->whereIn('status', $blockingStatuses)
            ->exists()) {
            throw DomainException::conflict(
                'ACTIVE_MEETINGS_AS_CLIENT',
                'У вас есть активные бронирования как клиент. Завершите или отмените их, затем подайте заявку на модель.',
            );
        }

        $existing = ModelApplication::query()
            ->where('user_id', $user->id)
            ->first();

        if ($existing !== null) {
            throw DomainException::conflict(
                'APPLICATION_ALREADY_SUBMITTED',
                'Вы уже отправили заявку на модель. Повторная отправка недоступна.',
            );
        }

        $application = DB::transaction(function () use ($user, $payload): ModelApplication {
            /** @var ModelApplication $application */
            $application = ModelApplication::query()->create([
                'user_id' => $user->id,
                'payload' => $payload,
                'status' => ModelApplicationStatus::Submitted,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'review_note' => null,
            ]);

            $photos = array_values(array_filter((array) ($payload['photos'] ?? [])));
            if (count($photos) > 0) {
                $first = (string) $photos[0];
                $photoUrl = str_starts_with($first, 'http')
                    ? $first
                    : Storage::disk('public')->url(ltrim($first, '/'));
                $user->update(['photo_url' => $photoUrl]);
            }

            $this->audit->log('model_application.submitted', $user, $application, [
                'application_id' => $application->id,
            ]);

            return $application;
        });

        $this->notifier->notifyUser(
            $user,
            "📝 Заявка модели отправлена и передана на модерацию.\nМы сообщим, когда статус изменится.",
            '/application-pending',
            'Открыть заявку',
        );
        $this->notifier->notifyAdmins(
            "📝 Новая заявка модели #{$application->id} от {$this->displayName($user)}.",
            '/admin/model-applications',
            'Открыть в админке',
        );

        return $application;
    }

    private function displayName(User $user): string
    {
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));

        return $name !== '' ? $name : ($user->username ?? 'пользователь');
    }
}
