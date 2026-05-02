<?php

declare(strict_types=1);

use App\Actions\Payment\ConfirmPaymentAction;
use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Enums\WalletTransactionType;
use App\Models\AppSetting;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\PlatformEarning;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Commission\CommissionService;

beforeEach(function (): void {
    config()->set('payments.commission', 0.15);
});

function bootMeetingPayment(int $priceThb, ?float $override = null): array
{
    $admin = User::factory()->admin()->create();
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create([
        'user_id' => $modelUser->id,
        'commission_override' => $override,
    ]);
    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Accepted,
        'price_thb' => $priceThb,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => $priceThb * 100,
        'currency' => 'THB',
        'status' => PaymentStatus::Submitted,
    ]);

    return [$admin, $payment, $profile, $modelUser];
}

it('creates a PlatformEarning row when a payment is confirmed', function (): void {
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(2000);

    app(ConfirmPaymentAction::class)->execute($payment, $admin);

    $earning = PlatformEarning::query()->where('payment_id', $payment->id)->first();
    expect($earning)->not->toBeNull();
    expect($earning->gross_minor)->toBe(200_000);
    expect((float) $earning->commission_rate)->toBe(0.15);
    expect($earning->commission_minor)->toBe(30_000);
    expect($earning->net_minor)->toBe(170_000);
    expect($earning->source)->toBe(PlatformEarning::SOURCE_DEFAULT);
    expect($earning->model_profile_id)->toBe($profile->id);
});

it('credits the model wallet with net amount only', function (): void {
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(1000);

    app(ConfirmPaymentAction::class)->execute($payment, $admin);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe(85_000);
    expect(WalletTransaction::query()
        ->where('type', WalletTransactionType::CreditPayment)
        ->count())->toBe(1);
});

it('uses model commission_override when set', function (): void {
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(2000, 0.05);

    app(ConfirmPaymentAction::class)->execute($payment, $admin);

    $earning = PlatformEarning::query()->where('payment_id', $payment->id)->first();
    expect((float) $earning->commission_rate)->toBe(0.05);
    expect($earning->commission_minor)->toBe(10_000);
    expect($earning->net_minor)->toBe(190_000);
    expect($earning->source)->toBe(PlatformEarning::SOURCE_MODEL_OVERRIDE);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe(190_000);
});

it('respects an updated default rate from AppSetting for new payments', function (): void {
    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '0.25');
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(1000);

    app(ConfirmPaymentAction::class)->execute($payment, $admin);

    $earning = PlatformEarning::query()->where('payment_id', $payment->id)->first();
    expect((float) $earning->commission_rate)->toBe(0.25);
    expect($earning->commission_minor)->toBe(25_000);
    expect($earning->net_minor)->toBe(75_000);
});

it('does not recompute existing earnings when default rate changes later', function (): void {
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(1000);
    app(ConfirmPaymentAction::class)->execute($payment, $admin);

    $before = PlatformEarning::query()->where('payment_id', $payment->id)->first();

    AppSetting::set(CommissionService::SETTING_DEFAULT_RATE, '0.40');

    $after = PlatformEarning::query()->where('payment_id', $payment->id)->first();
    expect((float) $after->commission_rate)->toBe((float) $before->commission_rate);
    expect($after->commission_minor)->toBe($before->commission_minor);
    expect($after->net_minor)->toBe($before->net_minor);
});

it('is idempotent on re-confirmation (no duplicate PlatformEarning)', function (): void {
    [$admin, $payment, $profile, $modelUser] = bootMeetingPayment(1000);

    app(ConfirmPaymentAction::class)->execute($payment, $admin);
    app(ConfirmPaymentAction::class)->execute($payment->fresh(), $admin);

    expect(PlatformEarning::query()->where('payment_id', $payment->id)->count())->toBe(1);
});
