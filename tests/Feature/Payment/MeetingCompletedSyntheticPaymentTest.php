<?php

declare(strict_types=1);

use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\PlatformEarning;
use App\Models\User;

it('creates admin synthetic payment and confirms when meeting completes without payment', function (): void {
    User::factory()->admin()->create();

    $modelUser = User::factory()->model()->create();
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $client = User::factory()->create();

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'price_thb' => 1000,
        'status' => MeetingStatus::Paid,
    ]);

    expect(Payment::query()->where('meeting_id', $meeting->id)->exists())->toBeFalse();

    $meeting->update(['status' => MeetingStatus::Completed]);

    $payment = Payment::query()->where('meeting_id', $meeting->id)->first();
    expect($payment)->not->toBeNull();
    expect($payment->gateway)->toBe('admin');
    expect($payment->tx_hash)->toBe('admin:meeting:'.$meeting->id);
    expect($payment->status)->toBe(PaymentStatus::Confirmed);

    expect(PlatformEarning::query()->where('payment_id', $payment->id)->exists())->toBeTrue();
});
