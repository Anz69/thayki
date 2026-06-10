<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Models\AppSetting;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExpirePendingMeetingJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    private const MIN_AGE_SECONDS = 30;

    public function __construct(public readonly int $meetingId) {}

    public function handle(TransitionMeetingStatusAction $transition): void
    {
        $configured = (int) (AppSetting::get('meeting_pending_ttl') ?? config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600)));
        $ttl = $configured > 0 ? $configured : 600;
        $effectiveTtl = max($ttl, self::MIN_AGE_SECONDS);

        \Illuminate\Support\Facades\DB::transaction(function () use ($transition, $effectiveTtl): void {

            $meeting = Meeting::query()->whereKey($this->meetingId)->lockForUpdate()->first();

            if ($meeting === null) {
                return;
            }

            if ($meeting->status !== MeetingStatus::Pending) {
                return;
            }

            if ($meeting->created_at === null) {
                Log::warning('[ExpirePendingMeetingJob] Refusing to expire meeting with null created_at', [
                    'meeting_id' => $meeting->id,
                ]);
                return;
            }

            $createdAtUtc = $meeting->created_at->copy()->setTimezone('UTC');
            $expireAtUtc  = $createdAtUtc->copy()->addSeconds($effectiveTtl);
            $nowUtc       = now()->setTimezone('UTC');

            if ($nowUtc->lt($expireAtUtc)) {
                $secondsRemaining = (int) $nowUtc->diffInSeconds($expireAtUtc, true);

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
