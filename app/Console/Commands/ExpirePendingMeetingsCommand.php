<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Models\AppSetting;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Expires every Pending meeting whose age exceeds the configured TTL.
 *
 * Run this on a schedule (every minute by default — see routes/console.php).
 * It is the source of truth for expiration when the queue driver is `sync`,
 * because sync queues ignore `delay()` and the per-meeting job alone cannot
 * be relied upon.
 */
class ExpirePendingMeetingsCommand extends Command
{
    protected $signature = 'meetings:expire-pending';

    protected $description = 'Mark every Pending meeting whose TTL has elapsed as Expired.';

    public function handle(TransitionMeetingStatusAction $transition): int
    {
        $configured = (int) (AppSetting::get('meeting_pending_ttl') ?? config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600)));
        $ttl = $configured > 0 ? $configured : 600;

        $cutoff = now()->copy()->subSeconds($ttl);

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

        $expired = 0;

        foreach ($candidates as $meetingId) {
            DB::transaction(function () use ($meetingId, $transition, $ttl, &$expired): void {
                /** @var Meeting|null $meeting */
                $meeting = Meeting::query()->whereKey($meetingId)->lockForUpdate()->first();

                if ($meeting === null
                    || $meeting->status !== MeetingStatus::Pending
                    || $meeting->created_at === null
                ) {
                    return;
                }

                if ($meeting->created_at->copy()->addSeconds($ttl)->isFuture()) {
                    return;
                }

                $actor = User::query()->find($meeting->client_id) ?? new User;
                $transition->execute($meeting, MeetingStatus::Expired, $actor, 'auto-expired');
                $expired++;
            });
        }

        if ($expired > 0) {
            $this->info("Expired {$expired} meeting(s).");
        }

        return self::SUCCESS;
    }
}
