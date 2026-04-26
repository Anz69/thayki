<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Auto-cancels meetings the model never confirmed in time.
 *
 * Definition of "in time": the meeting's `created_at` is more than the
 * configured TTL ago (default 2 hours) AND the meeting is still in the
 * `pending` state — i.e. the model has not pressed "Accept" yet.
 *
 * (Once the model accepts, the next gate is payment, which has its own
 * separate clock; see ExpirePendingMeetingsCommand for the historical
 * pending->expired sweep — this command operates on the "model failed
 * to acknowledge in 2h" window specifically.)
 *
 * NOTE: in practice both deadlines collapse onto the same `pending` state
 * — pending means "model hasn't accepted". We use the longer 2h window
 * here so it fires AFTER ExpirePendingMeetingsCommand if both are scheduled,
 * which is harmless: this command is idempotent because it re-checks status
 * inside a per-row lock.
 */
class AutoCancelStaleAcceptedMeetingsCommand extends Command
{
    protected $signature = 'meetings:auto-cancel-unconfirmed';

    protected $description = 'Cancels meetings the model failed to accept within the configured 2h window.';

    public function handle(TransitionMeetingStatusAction $transition): int
    {
        $ttlSeconds = (int) config('app.meeting_model_confirm_ttl', env('MEETING_MODEL_CONFIRM_TTL', 7200));
        if ($ttlSeconds <= 0) $ttlSeconds = 7200;

        $cutoff = now()->copy()->subSeconds($ttlSeconds);

        $candidates = Meeting::query()
            ->where('status', MeetingStatus::Pending->value)
            ->whereNotNull('created_at')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->limit(200)
            ->pluck('id');

        if ($candidates->isEmpty()) {
            return self::SUCCESS;
        }

        $cancelled = 0;

        foreach ($candidates as $meetingId) {
            DB::transaction(function () use ($meetingId, $transition, $ttlSeconds, &$cancelled): void {
                /** @var Meeting|null $meeting */
                $meeting = Meeting::query()->whereKey($meetingId)->lockForUpdate()->first();

                if ($meeting === null
                    || $meeting->status !== MeetingStatus::Pending
                    || $meeting->created_at === null
                ) {
                    return;
                }

                if ($meeting->created_at->copy()->addSeconds($ttlSeconds)->isFuture()) {
                    return;
                }

                $actor = User::query()->find($meeting->client_id) ?? new User;
                // Mark as cancelled (not expired) so the user-facing copy makes
                // sense: "your meeting was cancelled because the model didn't
                // confirm in time" rather than the generic expired path.
                $transition->execute(
                    $meeting,
                    MeetingStatus::Cancelled,
                    $actor,
                    'auto-cancelled: модель не подтвердила за 2 часа',
                );
                $cancelled++;
            });
        }

        if ($cancelled > 0) {
            $this->info("Auto-cancelled {$cancelled} unconfirmed meeting(s).");
        }

        return self::SUCCESS;
    }
}
