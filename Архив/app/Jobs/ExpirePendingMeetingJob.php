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

/**
 * Automatically expires a meeting still in Pending status after the configured TTL.
 */
class ExpirePendingMeetingJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly int $meetingId) {}

    public function handle(TransitionMeetingStatusAction $transition): void
    {
        $ttl = (int) config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600));
        if ($ttl <= 0) {
            $ttl = 600;
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($transition, $ttl): void {
            /** @var Meeting|null $meeting */
            $meeting = Meeting::query()->whereKey($this->meetingId)->lockForUpdate()->first();

            if ($meeting === null) {
                return;
            }

            if ($meeting->status !== MeetingStatus::Pending) {
                return;
            }

            if ($meeting->created_at !== null) {
                $expireAt = $meeting->created_at->copy()->addSeconds($ttl);
                if (now()->lt($expireAt)) {
                    $delaySeconds = (int) now()->diffInSeconds($expireAt);
                    if ($delaySeconds > 0 && $this->job !== null && config('queue.default') !== 'sync') {
                        $this->release($delaySeconds);
                    }
                    return;
                }
            }

            $actor = User::query()->find($meeting->client_id) ?? new User;
            $transition->execute($meeting, MeetingStatus::Expired, $actor, 'auto-expired');
        });
    }
}
