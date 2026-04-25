<?php

declare(strict_types=1);

use App\Exceptions\InvalidInitDataException;
use App\Services\Telegram\InitDataValidator;
use Tests\Helpers\TelegramInitData;

beforeEach(function (): void {
    config()->set('telegram.bot_token', 'test-bot-token');
    config()->set('telegram.init_data_ttl', 86400);
    config()->set('telegram.allow_unsigned', false);
    config()->set('app.env', 'testing');
});

it('accepts a valid initData payload', function (): void {
    $initData = TelegramInitData::build();

    $result = app(InitDataValidator::class)->validate($initData);

    expect($result['user']['id'])->toBe(99000001);
    expect($result['auth_date'])->toBeGreaterThan(0);
});

it('rejects a payload with an invalid hash', function (): void {
    $initData = TelegramInitData::buildInvalid();

    app(InitDataValidator::class)->validate($initData);
})->throws(InvalidInitDataException::class);

it('rejects an expired auth_date', function (): void {
    $initData = TelegramInitData::build(authDate: time() - 86401);

    app(InitDataValidator::class)->validate($initData);
})->throws(InvalidInitDataException::class);

it('rejects a payload missing hash', function (): void {
    app(InitDataValidator::class)->validate('auth_date=123&user=%7B%7D');
})->throws(InvalidInitDataException::class);

it('rejects empty initData', function (): void {
    app(InitDataValidator::class)->validate('');
})->throws(InvalidInitDataException::class);

it('rejects malformed user payload', function (): void {
    $pairs = [
        'auth_date' => (string) time(),
        'user' => 'not-a-json',
    ];
    $built = InitDataValidator::build($pairs, 'test-bot-token');
    app(InitDataValidator::class)->validate($built);
})->throws(InvalidInitDataException::class);
