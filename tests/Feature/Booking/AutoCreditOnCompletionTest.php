<?php

declare(strict_types=1);

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\PlatformEarning;
use App\Models\User;
use App\Models\Wallet;

function bootCompletionScenario(MeetingStatus $startStatus = MeetingStatus::Paid): array
{
    User::factory()->admin()->create(); // observer fallback actor
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => $startStatus,
        'price_thb' => 1000,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => 100_000,
        'status' => PaymentStatus::Submitted,
    ]);

    return [$meeting, $payment, $modelUser];
}

it('auto-credits the model when the meeting is transitioned to Completed via the state machine', function (): void {
    [$meeting, $payment, $modelUser] = bootCompletionScenario(MeetingStatus::Paid);
    $admin = User::factory()->admin()->create();

    app(TransitionMeetingStatusAction::class)->execute($meeting, MeetingStatus::Completed, $admin);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe(85_000);
    expect(PlatformEarning::query()->where('payment_id', $payment->id)->count())->toBe(1);
    expect($payment->fresh()->status)->toBe(PaymentStatus::Confirmed);
});

it('auto-credits the model when status is set directly (Filament direct edit)', function (): void {
    [$meeting, $payment, $modelUser] = bootCompletionScenario(MeetingStatus::Paid);

    $meeting->update(['status' => MeetingStatus::Completed]);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe(85_000);
    expect(PlatformEarning::query()->count())->toBe(1);
});

it('does not double-credit when payment was already confirmed before completion', function (): void {
    [$meeting, $payment, $modelUser] = bootCompletionScenario(MeetingStatus::Paid);

    $payment->update(['status' => PaymentStatus::Confirmed, 'confirmed_at' => now()]);
    Wallet::query()->where('user_id', $modelUser->id)->update(['balance_minor' => 85_000]);
    PlatformEarning::query()->create([
        'payment_id' => $payment->id,
        'meeting_id' => $meeting->id,
        'model_profile_id' => $meeting->model_profile_id,
        'gross_minor' => 100_000,
        'commission_rate' => 0.15,
        'commission_minor' => 15_000,
        'net_minor' => 85_000,
        'source' => PlatformEarning::SOURCE_DEFAULT,
        'confirmed_at' => now(),
    ]);

    $meeting->update(['status' => MeetingStatus::Completed]);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe(85_000); // unchanged
    expect(PlatformEarning::query()->count())->toBe(1);
});
