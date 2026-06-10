<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\MeetingStatus;
use App\Events\MeetingStatusChanged;
use App\Models\User;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\Log;

class SendMeetingStatusNotification
{
    public function handle(MeetingStatusChanged $event): void
    {
        try {
            $meeting = $event->meeting->loadMissing(['modelProfile.user', 'client']);
            $client  = $meeting->client;
            $model   = $meeting->modelProfile?->user;
            $status  = $meeting->status;

            $notifier = Notifier::default();

            $clientPath = "/meeting?id={$meeting->id}";
            $modelPath  = "/meeting?id={$meeting->id}";

            switch ($status) {
                case MeetingStatus::Pending:
                    $notifier->notifyUser(
                        $model,
                        "🆕 Новая бронь от {$this->displayName($client)}.",
                        $modelPath,
                    );
                    $notifier->notifyAdmins(
                        "🆕 Новая бронь #{$meeting->id} ({$this->displayName($client)} → {$this->displayName($model)}).",
                    );
                    break;

                case MeetingStatus::Accepted:
                    $notifier->notifyUser(
                        $client,
                        "✅ {$this->displayName($model)} приняла вашу бронь. Оплатите, чтобы подтвердить встречу.",
                        $clientPath,
                    );
                    break;

                case MeetingStatus::Paid:
                    $notifier->notifyUser(
                        $model,
                        "💰 {$this->displayName($client)} оплатил(а) встречу — встреча подтверждена.",
                        $modelPath,
                    );
                    $notifier->notifyUser(
                        $client,
                        "💰 Оплата прошла. Встреча подтверждена! Обсудите детали в чате.",
                        $clientPath,
                    );
                    $notifier->notifyAdmins("💰 Бронь #{$meeting->id} оплачена.");
                    break;

                case MeetingStatus::Rejected:
                    $notifier->notifyUser(
                        $client,
                        "❌ К сожалению, ваша бронь отклонена.",
                        $clientPath,
                    );
                    break;

                case MeetingStatus::Expired:
                    $notifier->notifyUser($client, "⌛ Время на ответ истекло — бронь отменена.");
                    $notifier->notifyUser($model, "⌛ Бронь от {$this->displayName($client)} истекла.");
                    break;

                case MeetingStatus::Cancelled:
                    $notifier->notifyUser($client, "🚫 Встреча отменена.", $clientPath);
                    $notifier->notifyUser($model, "🚫 Встреча с {$this->displayName($client)} отменена.", $modelPath);
                    $notifier->notifyAdmins("🚫 Бронь #{$meeting->id} отменена.");
                    break;

                case MeetingStatus::Completed:
                    $notifier->notifyUser(
                        $client,
                        "🎉 Встреча завершена!\nПожалуйста, оставьте отзыв или, если что-то пошло не так — жалобу.",
                        "/feedback?meeting={$meeting->id}",
                        'Оставить отзыв',
                    );
                    $notifier->notifyAdmins("🎉 Бронь #{$meeting->id} завершена.");
                    break;

                case MeetingStatus::Confirmed:
                    break;
            }
        } catch (\Throwable $e) {
            Log::warning('[SendMeetingStatusNotification] failed', [
                'meeting_id' => $event->meeting->id ?? null,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    private function displayName(?User $user): string
    {
        if ($user === null) return 'пользователь';
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
        return $name !== '' ? $name : ($user->username ?? 'пользователь');
    }
}
