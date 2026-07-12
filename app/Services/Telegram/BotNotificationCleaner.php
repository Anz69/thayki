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

    public function countForLead(User $user, int $leadId): int
    {
        return BotNotification::query()
            ->where('user_id', $user->id)
            ->where('lead_id', $leadId)
            ->count();
    }

    // Clear only the notifications tied to a specific request (not the client's other
    // leads). Returns how many were cleared.
    public function clearForLead(User $user, int $leadId): int
    {
        $rows = BotNotification::query()
            ->where('user_id', $user->id)
            ->where('lead_id', $leadId)
            ->get();

        foreach ($rows as $row) {
            $this->bot->deleteMessage((int) $row->tg_chat_id, (int) $row->message_id);
        }

        BotNotification::query()
            ->where('user_id', $user->id)
            ->where('lead_id', $leadId)
            ->delete();

        return $rows->count();
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

    // Automatic cleanup: remove notifications older than the given age. Default 46h —
    // NOT 48h: Telegram refuses to let a bot delete its own messages once they are
    // older than 48h, so we must delete them a bit before that wall (the scheduler
    // runs every 30 min, catching each notification inside the deletable window).
    public function clearOlderThan(int $hours = 46): int
    {
        $threshold = Carbon::now()->subHours($hours);

        $rows = BotNotification::query()->where('created_at', '<', $threshold)->get();

        foreach ($rows as $row) {
            $this->bot->deleteMessage((int) $row->tg_chat_id, (int) $row->message_id);
        }

        return BotNotification::query()->where('created_at', '<', $threshold)->delete();
    }
}
