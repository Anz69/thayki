<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\BotNotification;
use App\Models\User;
use Illuminate\Support\Carbon;

class BotNotificationCleaner
{
    public function __construct(private readonly TelegramBotService $bot) {}

    public static function default(): self
    {
        return new self(TelegramBotService::fromConfig());
    }

    public function countForUser(User $user): int
    {
        return BotNotification::query()->where('user_id', $user->id)->count();
    }

    // Delete every tracked bot notification for this client from the Telegram chat and
    // from the DB. The pinned welcome is never tracked, so it stays. Returns how many
    // notifications were cleared.
    public function clearForUser(User $user): int
    {
        $rows = BotNotification::query()->where('user_id', $user->id)->get();

        foreach ($rows as $row) {
            $this->bot->deleteMessage((int) $row->tg_chat_id, (int) $row->message_id);
        }

        BotNotification::query()->where('user_id', $user->id)->delete();

        return $rows->count();
    }

    // Automatic cleanup: remove notifications older than the given age (default 48h).
    public function clearOlderThan(int $hours = 48): int
    {
        $threshold = Carbon::now()->subHours($hours);

        $rows = BotNotification::query()->where('created_at', '<', $threshold)->get();

        foreach ($rows as $row) {
            $this->bot->deleteMessage((int) $row->tg_chat_id, (int) $row->message_id);
        }

        return BotNotification::query()->where('created_at', '<', $threshold)->delete();
    }
}
