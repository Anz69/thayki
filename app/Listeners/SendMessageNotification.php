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
                if ($sender !== null && $recipient->id === $sender->id) continue;

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

    private function displayName(?User $user): string
    {
        if ($user === null) return 'Пользователь';
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
        return $name !== '' ? $name : ($user->username ?? 'Пользователь');
    }
}
