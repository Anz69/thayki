<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Telegram\Notifier;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    config(['cache.default' => 'array']);
    Cache::flush();
});

test('duplicate notifyUser with same dedup token sends telegram once', function (): void {
    $bot = Mockery::mock(TelegramBotService::class);
    $bot->shouldReceive('sendMessage')->once()->with(
        424242,
        Mockery::type('string'),
        Mockery::any(),
        Mockery::any(),
    );

    $notifier = new Notifier($bot);

    $user = User::factory()->make([
        'tg_chat_id' => 424242,
        'notifications_enabled' => true,
    ]);

    $notifier->notifyUser($user, '✉️ identical template', '/support', null, 'msg:9');
    $notifier->notifyUser($user, '✉️ identical template', '/support', null, 'msg:9');
});

test('notifyUser with different dedup tokens sends twice for identical body', function (): void {
    $bot = Mockery::mock(TelegramBotService::class);
    $bot->shouldReceive('sendMessage')->twice();

    $notifier = new Notifier($bot);

    $user = User::factory()->make([
        'tg_chat_id' => 424242,
        'notifications_enabled' => true,
    ]);

    $notifier->notifyUser($user, '✉️ У вас новое сообщение', '/support', 'Кнопка', 'msg:1');
    $notifier->notifyUser($user, '✉️ У вас новое сообщение', '/support', 'Кнопка', 'msg:2');
});

test('notifyUser without dedup token deduplicates on same text and open path', function (): void {
    $bot = Mockery::mock(TelegramBotService::class);
    $bot->shouldReceive('sendMessage')->once();

    $notifier = new Notifier($bot);

    $user = User::factory()->make([
        'tg_chat_id' => 900001,
        'notifications_enabled' => true,
    ]);

    $notifier->notifyUser($user, 'Meeting text', '/meeting?id=1');
    $notifier->notifyUser($user, 'Meeting text', '/meeting?id=1');
});
