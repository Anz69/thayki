<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\StartInvite;
use App\Models\StartInviteUse;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Encapsulates the bot's /start logic.
 *
 * Two paths:
 *   1. Bare `/start`: greet the user with the public/strange message —
 *      "join our chat". User stays strange (or becomes strange if new).
 *   2. `/start <token>`: look up token in `start_invites`. If valid:
 *        - kind=verify  → flip is_strange=false, send full welcome.
 *        - kind=model   → flip is_strange=false AND nudge to "become a model".
 *      Each token is single-use per (token,user) and respects max_uses.
 *
 * Always captures `tg_chat_id` so subsequent notifications can reach the user.
 */
class StartHandler
{
    public function __construct(private readonly TelegramBotService $bot)
    {
    }

    public static function default(): self
    {
        return new self(TelegramBotService::fromConfig());
    }

    /**
     * @param array $tgFrom Telegram "from" object: id, username, first_name, last_name, language_code
     */
    public function handle(int $chatId, array $tgFrom, ?string $startParam): void
    {
        $telegramId = (int) ($tgFrom['id'] ?? 0);
        if ($telegramId <= 0) return;

        $user = $this->upsertUser($telegramId, $chatId, $tgFrom);

        if ($startParam === null || $startParam === '') {
            $this->sendStrangeWelcome($chatId);
            return;
        }

        $invite = StartInvite::query()->where('token', $startParam)->first();

        if ($invite === null || ! $invite->isUsable()) {
            $this->sendStrangeWelcome($chatId, expired: $invite !== null);
            return;
        }

        DB::transaction(function () use ($invite, $user): void {
            $invite = StartInvite::query()->whereKey($invite->id)->lockForUpdate()->first();
            if ($invite === null || ! $invite->isUsable()) return;

            // Idempotent per (invite, user): if this user already burned
            // this token, skip incrementing the counter.
            $alreadyUsed = StartInviteUse::query()
                ->where('invite_id', $invite->id)
                ->where('user_id', $user->id)
                ->exists();

            if (! $alreadyUsed) {
                StartInviteUse::query()->create([
                    'invite_id' => $invite->id,
                    'user_id'   => $user->id,
                ]);
                $invite->increment('times_used');
            }

            $user->is_strange = false;
            $user->save();
        });

        if ($invite->kind === StartInvite::KIND_MODEL) {
            $this->sendModelInviteWelcome($chatId);
            return;
        }

        $this->sendVerifiedWelcome($chatId);
    }

    private function upsertUser(int $telegramId, int $chatId, array $tgFrom): User
    {
        return DB::transaction(function () use ($telegramId, $chatId, $tgFrom): User {
            /** @var User $user */
            $user = User::query()->lockForUpdate()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name'    => (string) ($tgFrom['first_name'] ?? 'User'),
                    'last_name'     => isset($tgFrom['last_name']) ? (string) $tgFrom['last_name'] : null,
                    'username'      => isset($tgFrom['username']) ? (string) $tgFrom['username'] : null,
                    'language_code' => isset($tgFrom['language_code']) ? (string) $tgFrom['language_code'] : null,
                    'role'          => UserRole::Client,
                    'status'        => UserStatus::Active,
                    'tg_chat_id'    => $chatId,
                ],
            );

            // Always refresh chat id (could be different if user blocked & re-started).
            $dirty = false;
            if ($user->tg_chat_id !== $chatId) {
                $user->tg_chat_id = $chatId;
                $dirty = true;
            }
            if (isset($tgFrom['username']) && $user->username !== (string) $tgFrom['username']) {
                $user->username = (string) $tgFrom['username'];
                $dirty = true;
            }
            if ($dirty) $user->save();

            return $user;
        });
    }

    private function sendStrangeWelcome(int $chatId, bool $expired = false): void
    {
        $text = $expired
            ? "Ссылка устарела или больше не действует.\n\nВы можете присоединиться к нашему чату @ThaikyChat и начать общение!"
            : "Здравствуйте! 👋\n\nВы можете присоединиться к нашему чату @ThaikyChat и начать общение!";

        $this->bot->sendMessage($chatId, $text);
    }

    private function sendVerifiedWelcome(int $chatId): void
    {
        $this->bot->sendMessage(
            $chatId,
            "Добро пожаловать! Доступ открыт. Откройте мини-приложение, чтобы начать.",
            openPath: '/home',
            buttonLabel: 'Открыть приложение',
        );
    }

    private function sendModelInviteWelcome(int $chatId): void
    {
        $this->bot->sendMessage(
            $chatId,
            "Привет! Вы получили приглашение стать моделью.\nОткройте приложение и заполните анкету.",
            openPath: '/become-model',
            buttonLabel: 'Стать моделью',
        );
    }
}
