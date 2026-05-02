<?php

declare(strict_types=1);

namespace App\Observers;

use App\Actions\Payment\ConfirmPaymentAction;
use App\Actions\Payment\EnsureSyntheticPaymentForMeetingAction;
use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * When a meeting transitions into Completed, the model has effectively
 * fulfilled the deal — auto-confirm any still-Submitted/Pending payment so
 * the model wallet is credited without a separate manual admin step.
 *
 * The observer covers ALL writes (state-machine transitions, Filament direct
 * edits, console scripts), because Eloquent fires `updated` regardless of the
 * write path. ConfirmPaymentAction is itself idempotent (unique on payment_id
 * for the platform earning, idempotent credit by reference), so multiple
 * triggers do not double-credit.
 */
class MeetingObserver
{
    public function updated(Meeting $meeting): void
    {
        if (! $meeting->wasChanged('status')) {
            return;
        }

        if ($meeting->status !== MeetingStatus::Completed) {
            return;
        }

        $payment = $meeting->payment()->first();
        if ($payment === null) {
            $payment = app(EnsureSyntheticPaymentForMeetingAction::class)->execute($meeting);
        }
        if ($payment === null) {
            return;
        }

        if (! in_array($payment->status, [PaymentStatus::Submitted, PaymentStatus::Pending], true)) {
            return;
        }

        $actor = $this->systemActor();
        if ($actor === null) {
            Log::warning('[MeetingObserver] no system actor available; skipping auto-credit', [
                'meeting_id' => $meeting->id,
                'payment_id' => $payment->id,
            ]);

            return;
        }

        try {
            app(ConfirmPaymentAction::class)->execute($payment, $actor);
        } catch (\Throwable $e) {
            Log::error('[MeetingObserver] auto-confirm failed', [
                'meeting_id' => $meeting->id,
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Pick a deterministic actor for the auto-confirm audit trail. Prefers
     * the authenticated admin (Filament edits, API calls) and falls back to
     * the first available admin for system-driven writes (console, jobs).
     */
    private function systemActor(): ?User
    {
        $user = auth()->user();
        if ($user instanceof User && $user->role === UserRole::Admin) {
            return $user;
        }

        return User::query()
            ->where('role', UserRole::Admin)
            ->where('status', UserStatus::Active)
            ->orderBy('id')
            ->first();
    }
}
