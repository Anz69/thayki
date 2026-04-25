<?php

declare(strict_types=1);

use App\Actions\Payment\ConfirmPaymentAction;
use App\Enums\MeetingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\WithdrawalStatus;
use App\Jobs\ExpirePendingMeetingJob;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Models\Payment;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Laravel\Sanctum\Sanctum;

// ─── P0: Meeting auto-expire race ────────────────────────────────────────────

it('does not expire a pending meeting before the TTL has passed', function (): void {
    config()->set('app.meeting_pending_ttl', 600);
    config()->set('queue.default', 'sync');

    $client  = User::factory()->create();
    $profile = ModelProfile::factory()->create();
    $meeting = Meeting::factory()->create([
        'client_id'       => $client->id,
        'model_profile_id' => $profile->id,
        'status'          => MeetingStatus::Pending,
        'created_at'      => now()->subSeconds(30),
    ]);

    dispatch(new ExpirePendingMeetingJob($meeting->id));

    expect($meeting->fresh()->status)->toBe(MeetingStatus::Pending);
});

it('expires a pending meeting once TTL is exceeded', function (): void {
    config()->set('app.meeting_pending_ttl', 60);
    config()->set('queue.default', 'sync');

    $client  = User::factory()->create();
    $profile = ModelProfile::factory()->create();
    $meeting = Meeting::factory()->create([
        'client_id'        => $client->id,
        'model_profile_id' => $profile->id,
        'status'           => MeetingStatus::Pending,
        'created_at'       => now()->subSeconds(120),
    ]);

    dispatch(new ExpirePendingMeetingJob($meeting->id));

    expect($meeting->fresh()->status)->toBe(MeetingStatus::Expired);
});

it('does not expire a meeting that is no longer pending', function (): void {
    config()->set('app.meeting_pending_ttl', 1);
    config()->set('queue.default', 'sync');

    $client  = User::factory()->create();
    $profile = ModelProfile::factory()->create();
    $meeting = Meeting::factory()->create([
        'client_id'        => $client->id,
        'model_profile_id' => $profile->id,
        'status'           => MeetingStatus::Accepted,
        'created_at'       => now()->subSeconds(120),
    ]);

    dispatch(new ExpirePendingMeetingJob($meeting->id));

    expect($meeting->fresh()->status)->toBe(MeetingStatus::Accepted);
});

// ─── P0: ConfirmPayment with invalid meeting state ────────────────────────────

it('refuses to credit wallet when meeting is already cancelled', function (): void {
    $client    = User::factory()->create();
    $modelUser = User::factory()->create();
    $profile   = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $meeting   = Meeting::factory()->create([
        'client_id'        => $client->id,
        'model_profile_id' => $profile->id,
        'status'           => MeetingStatus::Cancelled,
        'price_thb'        => 1000,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id'   => $meeting->id,
        'user_id'      => $client->id,
        'status'       => PaymentStatus::Submitted,
        'amount_minor' => 100000,
    ]);

    expect(fn () => app(ConfirmPaymentAction::class)->execute($payment, $client))
        ->toThrow(\App\Exceptions\DomainException::class);

    $wallet = Wallet::query()->where('user_id', $modelUser->id)->first();
    expect($wallet)->toBeNull();
});

it('refuses to confirm payment that is already confirmed', function (): void {
    $client    = User::factory()->create();
    $modelUser = User::factory()->create();
    $profile   = ModelProfile::factory()->create(['user_id' => $modelUser->id]);
    $meeting   = Meeting::factory()->create([
        'client_id'        => $client->id,
        'model_profile_id' => $profile->id,
        'status'           => MeetingStatus::Paid,
        'price_thb'        => 1000,
    ]);
    $payment = Payment::factory()->create([
        'meeting_id'   => $meeting->id,
        'user_id'      => $client->id,
        'status'       => PaymentStatus::Confirmed,
        'amount_minor' => 100000,
    ]);

    $result = app(ConfirmPaymentAction::class)->execute($payment, $client);

    expect($result->status)->toBe(PaymentStatus::Confirmed);
});

// ─── P1: Duplicate message prevention ────────────────────────────────────────

it('does not duplicate a chat message when the same idempotency key is sent twice', function (): void {
    $user  = User::factory()->create();
    $chat  = \App\Models\Chat::factory()->withParticipant($user)->create();

    Sanctum::actingAs($user);

    $key = 'test-idem-key-' . uniqid();

    $first = $this->postJson("/api/v1/chats/{$chat->id}/messages", ['body' => 'Hello'], [
        'Idempotency-Key' => $key,
    ]);
    $first->assertCreated();

    $second = $this->postJson("/api/v1/chats/{$chat->id}/messages", ['body' => 'Hello'], [
        'Idempotency-Key' => $key,
    ]);
    $second->assertOk();

    expect(\App\Models\Message::query()->where('chat_id', $chat->id)->count())->toBe(1);
});

// ─── P1: Reject withdrawal returns funds ────────────────────────────────────

it('returns funds to wallet when admin rejects a withdrawal', function (): void {
    $admin = User::factory()->admin()->create();
    $user  = User::factory()->create();

    Wallet::factory()->create([
        'user_id'       => $user->id,
        'balance_minor' => 0,
        'locked_minor'  => 50000,
        'version'       => 1,
    ]);

    $withdrawal = Withdrawal::factory()->create([
        'user_id'      => $user->id,
        'amount_minor' => 50000,
        'status'       => WithdrawalStatus::Pending,
        'currency'     => 'THB',
        'method'       => PaymentMethod::Usdt->value,
    ]);

    app(\App\Actions\Wallet\ProcessWithdrawalAction::class)->reject($withdrawal, $admin, 'test');

    $wallet = Wallet::query()->where('user_id', $user->id)->firstOrFail();
    expect($wallet->balance_minor)->toBe(50000);
    expect($withdrawal->fresh()->status)->toBe(WithdrawalStatus::Rejected);
});

// ─── P2: Unauthenticated access returns 401 ──────────────────────────────────

it('returns 401 for protected endpoints without authentication', function (): void {
    $response = $this->getJson('/api/v1/auth/me');
    $response->assertUnauthorized();
    $response->assertJsonPath('error.code', 'UNAUTHENTICATED');
});

it('returns 403 when non-admin accesses admin endpoint', function (): void {
    $client = User::factory()->create();
    Sanctum::actingAs($client);

    $response = $this->getJson('/api/v1/admin/withdrawals');
    $response->assertForbidden();
});

// ─── P0: Client cannot access another user's meeting ─────────────────────────

it('returns 403 when a client tries to access another users meeting', function (): void {
    $client1 = User::factory()->create();
    $client2 = User::factory()->create();
    $profile = ModelProfile::factory()->create();

    $meeting = Meeting::factory()->create([
        'client_id'        => $client1->id,
        'model_profile_id' => $profile->id,
        'status'           => MeetingStatus::Pending,
    ]);

    Sanctum::actingAs($client2);
    $response = $this->getJson("/api/v1/meetings/{$meeting->id}");
    $response->assertForbidden();
});
