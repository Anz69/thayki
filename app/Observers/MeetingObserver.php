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

        $actor = $this->systemActor($meeting);
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

    private function systemActor(Meeting $meeting): ?User
    {
        $user = auth()->user();
        if ($user instanceof User && $user->role === UserRole::Admin) {
            return $user;
        }

        $configuredId = config('wallet.system_actor_user_id');
        if (is_int($configuredId) && $configuredId > 0) {
            $actor = User::query()->whereKey($configuredId)->first();
            if ($actor !== null) {
                return $actor;
            }
            Log::warning('[MeetingObserver] wallet.system_actor_user_id user not found', [
                'user_id' => $configuredId,
            ]);
        }

        $admin = User::query()
            ->where('role', UserRole::Admin)
            ->where('status', UserStatus::Active)
            ->orderBy('id')
            ->first();

        if ($admin !== null) {
            return $admin;
        }

        $modelOwner = $meeting->modelProfile()->first()?->user;
        if ($modelOwner !== null) {
            Log::info('[MeetingObserver] using model profile owner as audit actor (no admin configured)', [
                'meeting_id' => $meeting->id,
                'actor_user_id' => $modelOwner->id,
            ]);
        }

        return $modelOwner;
    }
}
