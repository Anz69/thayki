<?php

declare(strict_types=1);

use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Enums\WalletTransactionType;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\PlatformEarning;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;

it('reconstructs PlatformEarning rows from existing wallet transactions', function (): void {
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    $wallet = Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Paid,
        'price_thb' => 1000,
    ]);

    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => 100_000,
        'status' => PaymentStatus::Confirmed,
        'confirmed_at' => now()->subDay(),
    ]);

    // Simulate the legacy credit transaction shape (rate + gross in meta only).
    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => WalletTransactionType::CreditPayment,
        'amount_minor' => 85_000,
        'reference_type' => Payment::class,
        'reference_id' => $payment->id,
        'meta' => [
            'commission' => 0.15,
            'gross_minor' => 100_000,
        ],
    ]);

    $this->artisan('platform:backfill-earnings')->assertSuccessful();

    $earning = PlatformEarning::query()->where('payment_id', $payment->id)->first();
    expect($earning)->not->toBeNull();
    expect($earning->gross_minor)->toBe(100_000);
    expect((float) $earning->commission_rate)->toBe(0.15);
    expect($earning->commission_minor)->toBe(15_000);
    expect($earning->net_minor)->toBe(85_000);
});

it('is idempotent on repeated backfill runs', function (): void {
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    $wallet = Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Paid,
        'price_thb' => 1000,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => 100_000,
        'status' => PaymentStatus::Confirmed,
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => WalletTransactionType::CreditPayment,
        'amount_minor' => 85_000,
        'reference_type' => Payment::class,
        'reference_id' => $payment->id,
        'meta' => ['commission' => 0.15, 'gross_minor' => 100_000],
    ]);

    $this->artisan('platform:backfill-earnings');
    $this->artisan('platform:backfill-earnings');

    expect(PlatformEarning::query()->count())->toBe(1);
});
