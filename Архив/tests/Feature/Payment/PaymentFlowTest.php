<?php

declare(strict_types=1);

use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Enums\WalletTransactionType;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Laravel\Sanctum\Sanctum;

it('creates a payment for an accepted meeting', function (): void {
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Accepted,
        'price_thb' => 3000,
    ]);

    Sanctum::actingAs($client, ['role:client']);

    $response = $this->postJson('/api/v1/payments', [
        'meeting_id' => $meeting->id,
        'method' => 'usdt',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.status', 'pending');
    $response->assertJsonPath('data.amount_minor', 3000 * 100);
});

it('confirms payment and credits the model wallet with commission applied', function (): void {
    config()->set('payments.commission', 0.15);

    $admin = User::factory()->admin()->create();
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Accepted,
        'price_thb' => 2000,
    ]);

    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => 2000 * 100,
        'currency' => 'THB',
        'gateway' => 'manual',
        'status' => PaymentStatus::Submitted,
    ]);

    Sanctum::actingAs($admin, ['role:admin']);

    $response = $this->postJson("/api/v1/admin/payments/{$payment->id}/confirm");
    $response->assertOk();
    $response->assertJsonPath('data.status', 'confirmed');

    $expectedCredit = (int) round(2000 * 100 * 0.85);
    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet->balance_minor)->toBe($expectedCredit);

    expect(WalletTransaction::query()
        ->where('type', WalletTransactionType::CreditPayment)
        ->count())->toBe(1);

    expect(Meeting::query()->find($meeting->id)->status)->toBe(MeetingStatus::Paid);
});

it('prevents confirming payment twice (idempotent credit)', function (): void {
    $admin = User::factory()->admin()->create();
    $client = User::factory()->create();
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id]);
    $profile = ModelProfile::factory()->create(['user_id' => $modelUser->id]);

    $meeting = Meeting::factory()->create([
        'client_id' => $client->id,
        'model_profile_id' => $profile->id,
        'status' => MeetingStatus::Accepted,
        'price_thb' => 1000,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id' => $meeting->id,
        'user_id' => $client->id,
        'amount_minor' => 100_000,
        'status' => PaymentStatus::Submitted,
    ]);

    Sanctum::actingAs($admin, ['role:admin']);

    $this->postJson("/api/v1/admin/payments/{$payment->id}/confirm")->assertOk();
    $this->postJson("/api/v1/admin/payments/{$payment->id}/confirm")->assertOk();

    expect(WalletTransaction::query()->where('type', WalletTransactionType::CreditPayment)->count())->toBe(1);
});
