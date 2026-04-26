<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\AdminUser;
use App\Models\User;

/**
 * High-level wrapper that turns "notify this user about X" calls into actual
 * bot messages, while honoring `notifications_enabled` and skipping anyone
 * without a `tg_chat_id`.
 *
 * A single Notifier holds one TelegramBotService instance for batched calls.
 */
class Notifier
{
    public function __construct(private readonly TelegramBotService $bot)
    {
    }

    public static function default(): self
    {
        return new self(TelegramBotService::fromConfig());
    }

    public function notifyUser(?User $user, string $text, ?string $openPath = null, ?string $buttonLabel = null): void
    {
        if ($user === null) return;
        if (! $user->notifications_enabled) return;
        if ($user->tg_chat_id === null) return;

        $this->bot->sendMessage($user->tg_chat_id, $text, $openPath, $buttonLabel);
    }

    public function notifyAdmins(string $text, ?string $openPath = null, ?string $buttonLabel = null): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('admin_users')) {
            return;
        }
        try {
            $admins = AdminUser::query()
                ->whereNotNull('tg_chat_id')
                ->where('notifications_enabled', true)
                ->get();
        } catch (\Throwable) {
            return; // Schema might be older; tolerate gracefully.
        }
        foreach ($admins as $admin) {
            $this->bot->sendMessage((int) $admin->tg_chat_id, $text, $openPath, $buttonLabel);
        }
    }
}
