<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Enums\UserRole;
use App\Models\AdminUser;
use App\Models\BotNotification;
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
        ?int $leadId = null,
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

        // Track client-facing notifications so they can be cleaned later (manually on
        // lead close/completion/cancel, or automatically after 48h). Staff notifications
        // are not tracked. The pinned welcome is sent elsewhere and never recorded.
        // leadId scopes tracking to a specific request so cleanup counts per-lead.
        $trackFor = $user->role === UserRole::Client ? $user : null;

        $this->sendDeduped((int) $user->tg_chat_id, $text, $openPath, $buttonLabel, $dedupToken, $trackFor, $leadId);
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
        ?User $trackFor = null,
        ?int $leadId = null,
    ): void {
        $fingerprint = $dedupToken !== null
            ? sha1($chatId.'|'.$dedupToken)
            : sha1($chatId.'|'.$text.'|'.($openPath ?? ''));
        $key = 'tg:notif:'.$fingerprint;

        if (! Cache::add($key, 1, self::DEDUP_TTL_SECONDS)) {
            return;
        }

        $messageId = $this->bot->sendMessageReturningId($chatId, $text, $openPath, $buttonLabel);

        if ($messageId !== null && $trackFor !== null) {
            try {
                BotNotification::query()->create([
                    'user_id' => $trackFor->id,
                    'lead_id' => $leadId,
                    'tg_chat_id' => $chatId,
                    'message_id' => $messageId,
                ]);
            } catch (\Throwable) {
            }
        }
    }
}
