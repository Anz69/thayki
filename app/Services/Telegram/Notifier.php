<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class Notifier
{

    private const DEDUP_TTL_SECONDS = 15;

    public function __construct(private readonly TelegramBotService $bot) {}

    public static function default(): self
    {
        return new self(TelegramBotService::fromConfig());
    }

    public function notifyUser(
        ?User $user,
        string $text,
        ?string $openPath = null,
        ?string $buttonLabel = null,
        ?string $dedupToken = null,
    ): void {
        if ($user === null) {
            return;
        }
        if (! $user->notifications_enabled) {
            return;
        }
        if ($user->tg_chat_id === null) {
            return;
        }

        $this->sendDeduped((int) $user->tg_chat_id, $text, $openPath, $buttonLabel, $dedupToken);
    }

    /**
     * @param  array<int, int>  $excludeChatIds  tg_chat_ids that already got a notification for
     *                                            this event (so an admin who is also a manager
     *                                            isn't pinged twice for one message).
     */
    public function notifyAdmins(
        string $text,
        ?string $openPath = null,
        ?string $buttonLabel = null,
        ?string $dedupToken = null,
        array $excludeChatIds = [],
    ): void {
        if (! Schema::hasTable('admin_users')) {
            return;
        }
        try {
            $admins = AdminUser::query()
                ->whereNotNull('tg_chat_id')
                ->where('notifications_enabled', true)
                ->get();
        } catch (\Throwable) {
            return;
        }
        $exclude = array_map('intval', $excludeChatIds);
        foreach ($admins as $admin) {
            if (in_array((int) $admin->tg_chat_id, $exclude, true)) {
                continue;
            }
            $this->sendDeduped((int) $admin->tg_chat_id, $text, $openPath, $buttonLabel, $dedupToken);
        }
    }

    private function sendDeduped(
        int $chatId,
        string $text,
        ?string $openPath,
        ?string $buttonLabel,
        ?string $dedupToken = null,
    ): void {
        $fingerprint = $dedupToken !== null
            ? sha1($chatId.'|'.$dedupToken)
            : sha1($chatId.'|'.$text.'|'.($openPath ?? ''));
        $key = 'tg:notif:'.$fingerprint;

        if (! Cache::add($key, 1, self::DEDUP_TTL_SECONDS)) {
            return;
        }

        $this->bot->sendMessage($chatId, $text, $openPath, $buttonLabel);
    }
}
