<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Automatically expires a meeting still in Pending status after the configured TTL.
 *
 * SAFETY: This job is idempotent and **refuses** to expire a meeting whose age
 * is less than the configured TTL — regardless of how it was invoked. This
 * guarantees that even if the queue driver ignores `delay()` (as the `sync`
 * driver does), a freshly-created meeting will never be expired.
 *
 * The scheduled command `meetings:expire-pending` (registered in routes/console.php)
 * is the primary mechanism for catching meetings that have actually exceeded TTL.
 */
class ExpirePendingMeetingJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** Hard floor: never expire a meeting younger than this, no matter what TTL says. */
    private const MIN_AGE_SECONDS = 30;

    public function __construct(public readonly int $meetingId) {}

    public function handle(TransitionMeetingStatusAction $transition): void
    {
        $configured = (int) config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600));
        $ttl = $configured > 0 ? $configured : 600;
        // Even if config is intentionally tiny, never go below the safety floor.
        $effectiveTtl = max($ttl, self::MIN_AGE_SECONDS);

        \Illuminate\Support\Facades\DB::transaction(function () use ($transition, $effectiveTtl): void {
            /** @var Meeting|null $meeting */
            $meeting = Meeting::query()->whereKey($this->meetingId)->lockForUpdate()->first();

            if ($meeting === null) {
                return;
            }

            if ($meeting->status !== MeetingStatus::Pending) {
                return;
            }

            // SAFETY 1: refuse to expire a meeting with no created_at timestamp.
            if ($meeting->created_at === null) {
                Log::warning('[ExpirePendingMeetingJob] Refusing to expire meeting with null created_at', [
                    'meeting_id' => $meeting->id,
                ]);
                return;
            }

            // SAFETY 2: compare in UTC to dodge timezone drift between PHP/DB.
            $createdAtUtc = $meeting->created_at->copy()->setTimezone('UTC');
            $expireAtUtc  = $createdAtUtc->copy()->addSeconds($effectiveTtl);
            $nowUtc       = now()->setTimezone('UTC');

            if ($nowUtc->lt($expireAtUtc)) {
                $secondsRemaining = (int) $nowUtc->diffInSeconds($expireAtUtc, true);

                // For real queue drivers, push the job back. For sync, simply abort —
                // the scheduled command will catch this meeting once TTL elapses.
                if ($secondsRemaining > 0
                    && $this->job !== null
                    && config('queue.default') !== 'sync'
                ) {
                    $this->release($secondsRemaining);
                }
                return;
            }

            $actor = User::query()->find($meeting->client_id) ?? new User;
            $transition->execute($meeting, MeetingStatus::Expired, $actor, 'auto-expired');
        });
    }
}
