<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Models\Chat;
use App\Models\Lead;
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

    private const READ_DEBOUNCE_SECONDS = 1;

    public function __construct(public readonly int $messageId) {}

    public function handle(): void
    {
        try {

            $message = Message::query()->with('sender')->find($this->messageId);
            if ($message === null) {
                return;
            }

            if (! in_array((string) $message->type, ['text', 'image', ''], true)) {
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

            $isSupport = $chat->type === ChatType::Support || $chat->type === ChatType::Lead;
            $isLead = $chat->type === ChatType::Lead;
            $notifier = Notifier::default();

            $lead = $isLead ? Lead::query()->where('chat_id', $chat->id)->first() : null;
            $leadId = $lead?->id;

            if ($isLead) {
                $firstId = (int) Message::query()->where('chat_id', $chat->id)->min('id');
                if ($firstId === (int) $message->id) {
                    return;
                }
            }

            $senderIsSupport = $isSupport
                && $sender !== null
                && (int) ($sender->telegram_id ?? -1) === 0;

            $senderIsStaff = in_array($sender?->role, [UserRole::Manager, UserRole::Admin], true);

            $preview = ($message->type === null || $message->type === 'text')
                ? trim((string) $message->body)
                : '';
            $preview = $preview !== '' ? e(mb_substr($preview, 0, 200)) : '';

            $notified = [];

            if ($isSupport && ! $senderIsSupport && ! $senderIsStaff) {
                $notifier->notifyAdmins(
                    ($isLead ? '📩 Новое сообщение по заявке от <b>' : '💬 Новое сообщение в поддержке от <b>')
                        .$this->senderDisplayName($sender, 'ru').'</b>',
                    null,
                    null,
                    $dedupToken,
                );

                $managers = User::query()
                    ->where('role', UserRole::Manager->value)
                    ->whereNotNull('tg_chat_id')
                    ->where('notifications_enabled', true)
                    ->when($isLead && $lead?->manager_id, fn ($q) => $q->where('id', $lead->manager_id))
                    ->get();
                foreach ($managers as $manager) {
                    if ($sender !== null && (int) $manager->id === (int) $sender->id) {
                        continue;
                    }
                    $mLocale = $this->localeFor($manager);
                    $mText = $isLead
                        ? trans('notifications.new_message_lead', ['id' => $leadId], $mLocale)
                        : trans('notifications.new_message_support', [], $mLocale);
                    if ($isLead && $preview !== '') {
                        $mText .= "\n\n".$preview;
                    }
                    $notifier->notifyUser(
                        $manager,
                        $mText,
                        $isLead ? "/request/chat?id={$chat->id}&lead={$leadId}&from=".rawurlencode('/manager/leads') : '/manager/support',
                        trans('notifications.open_chat', [], $mLocale),
                        $dedupToken.':m'.$manager->id,
                    );
                    $notified[$manager->id] = true;
                }
            }

            $openPath = $isLead ? "/request/chat?id={$chat->id}".($leadId ? "&lead={$leadId}" : '') : ($isSupport ? '/support' : "/chat?id={$chat->id}");

            foreach ($chat->participants as $participant) {
                $recipient = $participant->user;
                if ($recipient === null) {
                    continue;
                }
                if ($this->isSameUser($sender, $recipient)) {
                    continue;
                }

                if (isset($notified[$recipient->id])) {
                    continue;
                }

                if ($participant->last_read_at !== null
                    && $message->created_at !== null
                    && $participant->last_read_at->greaterThanOrEqualTo($message->created_at)) {
                    continue;
                }

                $locale = $this->localeFor($recipient);

                if ($isLead) {
                    $text = trans('notifications.new_message_lead', ['id' => $leadId], $locale);
                } elseif ($isSupport) {
                    $text = trans('notifications.new_message_support', [], $locale);
                } else {
                    $title = $senderIsStaff
                        ? trans('notifications.manager_name', [], $locale)
                        : $this->senderDisplayName($sender, $locale);
                    $text = trans('notifications.new_message', ['name' => $title], $locale);
                }
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

    private function localeFor(?User $user): string
    {
        $code = strtolower((string) ($user->language_code ?? ''));

        if (str_starts_with($code, 'zh')) {
            return 'zh';
        }

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
