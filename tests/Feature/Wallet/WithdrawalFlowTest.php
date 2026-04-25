<?php

declare(strict_types=1);

use App\Enums\WithdrawalStatus;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    config()->set('payments.min_withdrawal', 1);
});

it('allows a model to request a withdrawal when funds are available', function (): void {
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id, 'balance_minor' => 500_000]);

    Sanctum::actingAs($modelUser, ['role:model']);

    $response = $this->postJson('/api/v1/withdrawals', [
        'amount_minor' => 100_000,
        'method' => 'usdt',
        'wallet_address' => 'tx-addr',
    ]);

    $response->assertCreated();
    expect(Wallet::query()->where('user_id', $modelUser->id)->value('balance_minor'))->toBe(400_000);
});

it('forbids client users from requesting withdrawals', function (): void {
    $client = User::factory()->create();
    Wallet::factory()->create(['user_id' => $client->id, 'balance_minor' => 500_000]);

    Sanctum::actingAs($client, ['role:client']);

    $this->postJson('/api/v1/withdrawals', [
        'amount_minor' => 100_000,
        'method' => 'usdt',
        'wallet_address' => 'x',
    ])->assertStatus(403);
});

it('blocks withdrawal when balance is insufficient', function (): void {
    $modelUser = User::factory()->model()->create();
    Wallet::factory()->create(['user_id' => $modelUser->id, 'balance_minor' => 100]);

    Sanctum::actingAs($modelUser, ['role:model']);

    $this->postJson('/api/v1/withdrawals', [
        'amount_minor' => 500,
        'method' => 'usdt',
        'wallet_address' => 'x',
    ])->assertStatus(422);
});

it('refunds the wallet when admin rejects a withdrawal', function (): void {
    $admin = User::factory()->admin()->create();
    $modelUser = User::factory()->model()->create();
    $wallet = Wallet::factory()->create(['user_id' => $modelUser->id, 'balance_minor' => 300]);

    $withdrawal = Withdrawal::factory()->create([
        'user_id' => $modelUser->id,
        'amount_minor' => 200,
        'status' => WithdrawalStatus::Pending,
    ]);

    $wallet->update(['balance_minor' => 100]);

    Sanctum::actingAs($admin, ['role:admin']);

    $response = $this->postJson("/api/v1/admin/withdrawals/{$withdrawal->id}/reject", ['note' => 'bad addr']);
    $response->assertOk();

    expect(Wallet::query()->where('user_id', $modelUser->id)->value('balance_minor'))->toBe(300);
});
