<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Enums\MeetingStatus;
use App\Events\MeetingStatusChanged;
use App\Exceptions\DomainException;
use App\Models\Meeting;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class TransitionMeetingStatusAction
{

    private const ALLOWED = [
        'pending'   => ['accepted', 'rejected', 'expired', 'cancelled'],
        'accepted'  => ['paid', 'cancelled', 'expired'],
        'paid'      => ['completed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled'],
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function execute(Meeting $meeting, MeetingStatus $target, User $actor, ?string $reason = null): Meeting
    {
        return DB::transaction(function () use ($meeting, $target, $actor, $reason): Meeting {
            $meeting = Meeting::query()->whereKey($meeting->id)->lockForUpdate()->firstOrFail();

            $previous = $meeting->status;
            $allowed = self::ALLOWED[$previous->value] ?? [];

            if (! in_array($target->value, $allowed, true)) {
                throw DomainException::conflict(
                    'MEETING_TRANSITION_INVALID',
                    "Cannot transition meeting from {$previous->value} to {$target->value}.",
                );
            }

            $update = ['status' => $target];
            if ($target === MeetingStatus::Accepted) {
                $update['accepted_at'] = now();
            }
            if ($target === MeetingStatus::Paid) {
                $update['paid_at'] = now();
                if ($meeting->confirmed_at === null) {
                    $update['confirmed_at'] = now();
                }
            }
            if ($target === MeetingStatus::Confirmed) {
                $update['confirmed_at'] = now();
            }
            if ($target === MeetingStatus::Completed) {
                $update['completed_at'] = now();
            }
            if ($target === MeetingStatus::Cancelled) {
                $update['cancelled_at'] = now();
            }
            if ($target === MeetingStatus::Expired || $target === MeetingStatus::Rejected) {
                $update['closed_at'] = now();
            }
            if ($reason !== null) {
                $update['cancel_reason'] = $reason;
            }

            $meeting->update($update);

            $this->audit->log('meeting.'.$target->value, $actor, $meeting, [
                'previous' => $previous->value,
                'reason' => $reason,
            ]);

            event(new MeetingStatusChanged($meeting, $previous));

            return $meeting->fresh();
        });
    }
}
