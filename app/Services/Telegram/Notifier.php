<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * High-level wrapper that turns "notify this user about X" calls into actual
 * bot messages, while honoring `notifications_enabled` and skipping anyone
 * without a `tg_chat_id`.
 *
 * Dedup: by default a fingerprint of (chat_id, text, openPath); optional
 * dedupToken scopes uniqueness per logical message (e.g. chat msg id) so
 * identical template text (support pings) still delivers each message.
 * Covers accidental dupes (double dispatch, queue retry, …).
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
            return; // Schema might be older; tolerate gracefully.
        }
        foreach ($admins as $admin) {
            $this->sendDeduped((int) $admin->tg_chat_id, $text, $openPath, $buttonLabel, $dedupToken);
        }
    }

    /**
     * Atomic "send if not seen this fingerprint recently". Cache::add
     * returns true only when the key was actually added (= didn't exist
     * yet), so any racing duplicate calls collapse to exactly one delivery.
     */
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
            return; // identical message already sent within the window
        }

        $this->bot->sendMessage($chatId, $text, $openPath, $buttonLabel);
    }
}
