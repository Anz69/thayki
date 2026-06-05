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
use Illuminate\Support\Sleep;

class SendChatMessageNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Short pause so a fast read receipt can update the message before we notify. */
    private const READ_DEBOUNCE_SECONDS = 1;

    public function __construct(public readonly int $messageId) {}

    public function handle(): void
    {
        try {
            /** @var Message|null $message */
            $message = Message::query()->with('sender')->find($this->messageId);
            if ($message === null) {
                return;
            }

            Sleep::for(self::READ_DEBOUNCE_SECONDS)->seconds();

            $message->refresh();
            if ($message->read_at !== null) {
                return;
            }

            $dedupToken = 'msg:'.$message->id;

            $chat = Chat::with(['participants.user', 'meeting'])->find($message->chat_id);
            if ($chat === null) {
                return;
            }

            $sender = $message->sender;
            // Lead chats behave like support: only the client is a participant,
            // so admins are pinged directly instead of via the participant loop.
            $isSupport = $chat->type === ChatType::Support || $chat->type === ChatType::Lead;
            $isLead = $chat->type === ChatType::Lead;
            $notifier = Notifier::default();

            // Support bot is identified by telegram_id = 0 (see SupportChats::getSupportUser).
            $senderIsSupport = $isSupport
                && $sender !== null
                && (int) ($sender->telegram_id ?? -1) === 0;

            if ($isSupport && ! $senderIsSupport) {
                // User wrote to support/lead — participants only contain the user,
                // so admins would never be reached via the loop below.
                // Ping all Filament admins directly (admins read Russian).
                $notifier->notifyAdmins(
                    ($isLead ? '📩 Новое сообщение по заявке от <b>' : '💬 Новое сообщение в поддержке от <b>')
                        .$this->senderDisplayName($sender, 'ru').'</b>',
                    null,
                    null,
                    $dedupToken,
                );
            }

            $openPath = $isLead ? "/request/chat?id={$chat->id}" : ($isSupport ? '/support' : "/chat?id={$chat->id}");

            foreach ($chat->participants as $participant) {
                $recipient = $participant->user;
                if ($recipient === null) {
                    continue;
                }
                if ($this->isSameUser($sender, $recipient)) {
                    continue;
                }

                if ($participant->last_read_at !== null
                    && $message->created_at !== null
                    && $participant->last_read_at->greaterThanOrEqualTo($message->created_at)) {
                    continue;
                }

                // Each recipient is notified in their own UI language.
                $locale = $this->localeFor($recipient);
                $title = $senderIsSupport
                    ? trans('notifications.support', [], $locale)
                    : $this->senderDisplayName($sender, $locale);
                $text = trans('notifications.new_message', ['name' => $title], $locale);
                $button = trans('notifications.open_chat', [], $locale);

                $notifier->notifyUser($recipient, $text, $openPath, $button, $dedupToken);
            }
        } catch (\Throwable $e) {
            Log::warning('[SendChatMessageNotificationJob] failed', [
                'message_id' => $this->messageId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function isSameUser(?User $a, ?User $b): bool
    {
        if ($a === null || $b === null) {
            return false;
        }
        if ($a->id === $b->id) {
            return true;
        }
        if ($a->telegram_id !== null && $a->telegram_id === $b->telegram_id) {
            return true;
        }
        if ($a->tg_chat_id !== null && $a->tg_chat_id === $b->tg_chat_id) {
            return true;
        }

        return false;
    }

    private function senderDisplayName(?User $user, string $locale = 'ru'): string
    {
        $fallback = trans('notifications.user_fallback', [], $locale);
        if ($user === null) {
            return $fallback;
        }
        $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));

        return $name !== '' ? $name : ($user->username ?? $fallback);
    }

    /** Map a user's stored Telegram/app language to a supported locale. */
    private function localeFor(?User $user): string
    {
        $code = strtolower((string) ($user->language_code ?? ''));

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
