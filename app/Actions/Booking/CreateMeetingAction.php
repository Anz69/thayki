<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Enums\MeetingStatus;
use App\Enums\ModelSchedule;
use App\Enums\UserRole;
use App\Events\MeetingStatusChanged;
use App\Exceptions\DomainException;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class CreateMeetingAction
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function execute(
        User $client,
        int $modelProfileId,
        CarbonImmutable $scheduledAt,
        int $durationHours,
    ): Meeting {
        if ($client->role === UserRole::Admin) {
            throw DomainException::forbidden('MEETING_FORBIDDEN', 'Admins cannot book meetings.');
        }

        $hasActiveMeeting = Meeting::query()
            ->where('client_id', $client->id)
            ->whereIn('status', array_map(fn (MeetingStatus $s) => $s->value, MeetingStatus::openStatuses()))
            ->exists();

        if ($hasActiveMeeting) {
            throw DomainException::conflict('MEETING_ALREADY_ACTIVE', 'У вас уже есть активная встреча. Сначала завершите её.');
        }

        return DB::transaction(function () use ($client, $modelProfileId, $scheduledAt, $durationHours): Meeting {
            /** @var ModelProfile|null $profile */
            $profile = ModelProfile::query()
                ->whereKey($modelProfileId)
                ->where('is_published', true)
                ->lockForUpdate()
                ->first();

            if ($profile === null) {
                throw DomainException::invalid('MODEL_NOT_AVAILABLE', 'Model profile is not available for booking.');
            }

            if ($profile->user_id === $client->id) {
                throw DomainException::forbidden('MEETING_FORBIDDEN', 'Cannot book yourself.');
            }

            $this->validateSchedule($profile, $scheduledAt);

            $startsAt = $scheduledAt;
            $endsAt = $scheduledAt->addHours($durationHours);

            $candidates = Meeting::query()
                ->where('model_profile_id', $profile->id)
                ->whereIn('status', array_map(fn (MeetingStatus $s) => $s->value, MeetingStatus::openStatuses()))
                ->where('scheduled_at', '<', $endsAt)
                ->where('scheduled_at', '>', $startsAt->copy()->subDay())
                ->lockForUpdate()
                ->get(['id', 'scheduled_at', 'duration_hours']);

            foreach ($candidates as $candidate) {
                $cStart = CarbonImmutable::instance($candidate->scheduled_at);
                $cEnd = $cStart->addHours((int) $candidate->duration_hours);
                if ($startsAt < $cEnd && $cStart < $endsAt) {
                    throw DomainException::conflict('SLOT_TAKEN', 'This time slot is already booked.');
                }
            }

            $matchingOption = $profile->priceOptions()->where('hours', $durationHours)->first();
            $price = $matchingOption
                ? $matchingOption->price_thb
                : $profile->hourly_rate_thb * $durationHours;

            /** @var Meeting $meeting */
            $meeting = Meeting::query()->create([
                'client_id' => $client->id,
                'model_profile_id' => $profile->id,
                'scheduled_at' => $startsAt,
                'duration_hours' => $durationHours,
                'price_thb' => $price,
                'status' => MeetingStatus::Pending,
            ]);

            $this->audit->log('meeting.created', $client, $meeting, [
                'model_profile_id' => $profile->id,
                'price_thb' => $price,
            ]);

            event(new MeetingStatusChanged($meeting, MeetingStatus::Pending));

            return $meeting;
        });
    }

    private function validateSchedule(ModelProfile $profile, CarbonImmutable $scheduledAt): void
    {
        $schedule = $profile->schedule;
        if ($schedule === ModelSchedule::Any) {
            return;
        }

        $hour = (int) $scheduledAt->format('H');
        $isDayTime = $hour >= 7 && $hour < 20;

        if ($schedule === ModelSchedule::Day && ! $isDayTime) {
            throw DomainException::invalid(
                'SCHEDULE_MISMATCH',
                'This model is only available during daytime (07:00–20:00).',
            );
        }

        if ($schedule === ModelSchedule::Night && $isDayTime) {
            throw DomainException::invalid(
                'SCHEDULE_MISMATCH',
                'This model is only available during nighttime (20:00–07:00).',
            );
        }
    }
}
