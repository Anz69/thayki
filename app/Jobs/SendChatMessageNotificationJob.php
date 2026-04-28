<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use App\Services\Telegram\Notifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendChatMessageNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $messageId) {}

    public function handle(): void
    {
        try {
            /** @var Message|null $message */
            $message = Message::query()->with('sender')->find($this->messageId);
            if ($message === null) return;

            if ($message->read_at !== null) return;

            $chat = Chat::with(['participants.user', 'meeting'])->find($message->chat_id);
            if ($chat === null) return;

            $sender    = $message->sender;
            $isSupport = $chat->type === ChatType::Support;
            $notifier  = Notifier::default();

            // Support bot is identified by telegram_id = 0 (see SupportChats::getSupportUser).
            $senderIsSupport = $isSupport
                && $sender !== null
                && (int) ($sender->telegram_id ?? -1) === 0;

            if ($isSupport && ! $senderIsSupport) {
                // User wrote to support — participants only contain the user,
                // so admins would never be reached via the loop below.
                // Ping all Filament admins directly.
                $notifier->notifyAdmins(
                    '💬 Новое сообщение в поддержке от <b>'.$this->senderDisplayName($sender).'</b>',
                );
            }

            $title    = $senderIsSupport ? 'Поддержка' : $this->senderDisplayName($sender);
            $text     = "✉️ У вас новое сообщение от <b>{$title}</b>";
            $openPath = $isSupport ? '/support' : "/chat?id={$chat->id}";

            foreach ($chat->participants as $participant) {
                $recipient = $participant->user;
                if ($recipient === null) continue;
                if ($this->isSameUser($sender, $recipient)) continue;

                if ($participant->last_read_at !== null
                    && $message->created_at !== null
                    && $participant->last_read_at->greaterThanOrEqualTo($message->created_at)) {
                    continue;
                }

                $notifier->notifyUser($recipient, $text, $openPath, 'Открыть чат');
            }
        } catch (\Throwable $e) {
            Log::warning('[SendChatMessageNotificationJob] failed', [
                'message_id' => $this->messageId,
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

    private function senderDisplayName(?User $user): string
    {
        if ($user === null) return 'Пользователь';
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
        return $name !== '' ? $name : ($user->username ?? 'Пользователь');
    }
}
