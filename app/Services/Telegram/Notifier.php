<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * High-level wrapper that turns "notify this user about X" calls into actual
 * bot messages, while honoring `notifications_enabled` and skipping anyone
 * without a `tg_chat_id`.
 *
 * Dedup: a fingerprint of (chat_id, text, openPath) is locked in cache for
 * a short window — the same message can never be sent to the same chat
 * twice in quick succession, no matter how many code paths fire it.
 * That covers accidental dupes (event registered twice, queue retry,
 * admin who is also the recipient, etc).
 */
class Notifier
{
    /**
     * How long an outgoing (chat_id, text, openPath) tuple stays "locked"
     * against resend. Long enough to swallow accidental dupes (event
     * registered twice, two webhook deliveries from Telegram, queue
     * retries, ...), short enough that legit re-notifies within minutes
     * still go through.
     */
    private const DEDUP_TTL_SECONDS = 15;

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

        $this->sendDeduped((int) $user->tg_chat_id, $text, $openPath, $buttonLabel);
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
            $this->sendDeduped((int) $admin->tg_chat_id, $text, $openPath, $buttonLabel);
        }
    }

    /**
     * Atomic "send if not seen this exact message recently". Cache::add
     * returns true only when the key was actually added (= didn't exist
     * yet), so any racing duplicate calls collapse to exactly one delivery.
     */
    private function sendDeduped(int $chatId, string $text, ?string $openPath, ?string $buttonLabel): void
    {
        $fingerprint = sha1($chatId.'|'.$text.'|'.($openPath ?? ''));
        $key = 'tg:notif:'.$fingerprint;

        if (! Cache::add($key, 1, self::DEDUP_TTL_SECONDS)) {
            return; // identical message already sent within the window
        }

        $this->bot->sendMessage($chatId, $text, $openPath, $buttonLabel);
    }
}
