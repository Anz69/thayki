<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\ChatType;
use App\Events\MessageSent;
use App\Models\Chat;
use App\Models\User;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\Log;

/**
 * Pings every chat participant (except the sender) via Telegram bot when a
 * new message arrives. Honors the recipient's `notifications_enabled` flag
 * and missing tg_chat_id (handled inside Notifier).
 *
 * Best-effort — failures here must not break the message itself.
 *
 * Anti-self-ping rules
 * --------------------
 * The sender must never receive a notification about their own message —
 * not just because it's noise but because the title rendered in the
 * notification IS the sender's display name, so a misrouted self-ping
 * looks like "I'm getting a message from myself" in the bot.
 *
 * We compare the sender to each recipient in three ways, ordered from
 * cheapest to most expensive:
 *   1. id            (User row equality — the obvious case)
 *   2. telegram_id   (catches data-integrity issues where two User rows
 *                     accidentally point at the same Telegram account)
 *   3. tg_chat_id    (catches the rare case where two test accounts in
 *                     dev share the same chat target — usually because
 *                     someone manually set tg_chat_id in the DB)
 * Any match is enough to skip.
 */
class SendMessageNotification
{
    public function handle(MessageSent $event): void
    {
        try {
            $message = $event->message;
            $chat = Chat::with(['participants.user', 'meeting'])->find($message->chat_id);
            if ($chat === null) return;

            $sender = $message->sender ?? $message->sender()->first();
            $senderName = $this->displayName($sender);

            $preview = mb_strimwidth(trim((string) $message->body), 0, 120, '…');
            if ($preview === '') {
                $preview = $message->attachment_path ? '[вложение]' : '';
            }

            $notifier = Notifier::default();

            $isSupport = $chat->type === ChatType::Support;
            $openPath  = $isSupport
                ? '/support'
                : ($chat->meeting_id !== null
                    ? "/chat?id={$chat->id}"
                    : '/chat');

            foreach ($chat->participants as $participant) {
                $recipient = $participant->user;
                if ($recipient === null) continue;
                if ($this->isSameUser($sender, $recipient)) continue;

                $title = $isSupport ? 'Поддержка' : $senderName;
                $text  = "✉️ <b>{$title}</b>\n{$preview}";

                $notifier->notifyUser($recipient, $text, $openPath, 'Открыть чат');
            }
        } catch (\Throwable $e) {
            Log::warning('[SendMessageNotification] failed', [
                'message_id' => $event->message->id ?? null,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    private function isSameUser(?User $a, ?User $b): bool
    {
        if ($a === null || $b === null) return false;
        if ($a->id === $b->id) return true;
        if ($a->telegram_id !== null && $a->telegram_id === $b->telegram_id) return true;
        if ($a->tg_chat_id !== null && $a->tg_chat_id === $b->tg_chat_id) return true;
        return false;
    }

    private function displayName(?User $user): string
    {
        if ($user === null) return 'Пользователь';
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
        return $name !== '' ? $name : ($user->username ?? 'Пользователь');
    }
}
