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

class AutoCancelStaleAcceptedMeetingsCommand extends Command
{
    protected $signature = 'meetings:auto-cancel-unconfirmed';

    protected $description = 'Cancels meetings the model failed to accept within the configured 2h window.';

    public function handle(TransitionMeetingStatusAction $transition): int
    {
        $ttlSeconds = (int) (AppSetting::get('meeting_model_confirm_ttl') ?? config('app.meeting_model_confirm_ttl', env('MEETING_MODEL_CONFIRM_TTL', 7200)));
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
