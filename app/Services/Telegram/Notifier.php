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

    public function notifyAdmins(
        string $text,
        ?string $openPath = null,
        ?string $buttonLabel = null,
        ?string $dedupToken = null,
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
        foreach ($admins as $admin) {
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
