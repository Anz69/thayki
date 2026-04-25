<?php

declare(strict_types=1);

use App\Models\User;
use Tests\Helpers\TelegramInitData;

beforeEach(function (): void {
    config()->set('telegram.bot_token', 'test-bot-token');
});

it('creates a user and issues a token from valid initData', function (): void {
    $initData = TelegramInitData::build();

    $response = $this->postJson('/api/v1/auth/telegram', ['init_data' => $initData]);

    $response->assertOk();
    $response->assertJson(['ok' => true]);
    $response->assertJsonStructure(['data' => ['token', 'user']]);

    expect(User::query()->where('telegram_id', 99000001)->count())->toBe(1);
});

it('rejects invalid initData signature', function (): void {
    $response = $this->postJson('/api/v1/auth/telegram', ['init_data' => TelegramInitData::buildInvalid()]);

    $response->assertStatus(401);
    $response->assertJson(['ok' => false]);
});

it('rejects expired initData', function (): void {
    $response = $this->postJson('/api/v1/auth/telegram', [
        'init_data' => TelegramInitData::build(authDate: time() - 100000),
    ]);

    $response->assertStatus(401);
});

it('reuses the same user on repeated logins with distinct initData', function (): void {
    $first = TelegramInitData::build(authDate: time() - 10, extraPairs: ['query_id' => 'q-1']);
    $second = TelegramInitData::build(authDate: time(), extraPairs: ['query_id' => 'q-2']);

    $this->postJson('/api/v1/auth/telegram', ['init_data' => $first])->assertOk();
    $this->postJson('/api/v1/auth/telegram', ['init_data' => $second])->assertOk();

    expect(User::query()->where('telegram_id', 99000001)->count())->toBe(1);
});

it('rejects replayed initData', function (): void {
    $initData = TelegramInitData::build();
    $this->postJson('/api/v1/auth/telegram', ['init_data' => $initData])->assertOk();
    $this->postJson('/api/v1/auth/telegram', ['init_data' => $initData])->assertStatus(409);
});

it('me endpoint requires auth', function (): void {
    $this->getJson('/api/v1/auth/me')->assertStatus(401);
});

it('me endpoint returns current user when authenticated', function (): void {
    $initData = TelegramInitData::build();
    $login = $this->postJson('/api/v1/auth/telegram', ['init_data' => $initData])->json();
    $token = $login['data']['token'];

    $response = $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/v1/auth/me');
    $response->assertOk();
    $response->assertJsonPath('data.telegram_id', 99000001);
});
