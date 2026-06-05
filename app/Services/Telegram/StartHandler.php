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
    public function __construct(private readonly TelegramBotService $bot) {}

    public static function default(): self
    {
        return new self(TelegramBotService::fromConfig());
    }

    /**
     * @param  array  $tgFrom  Telegram "from" object: id, username, first_name, last_name, language_code
     */
    public function handle(int $chatId, array $tgFrom, ?string $startParam): void
    {
        $telegramId = (int) ($tgFrom['id'] ?? 0);
        if ($telegramId <= 0) {
            return;
        }

        $user = $this->upsertUser($telegramId, $chatId, $tgFrom);

        $locale = $this->localeFor($user);

        if ($startParam === null || $startParam === '') {
            if (! $user->is_strange) {
                if ($user->role === UserRole::Model) {
                    $this->sendModelWelcome($chatId, $user->first_name ?? '', $locale);
                } else {
                    $this->sendVerifiedWelcome($chatId, $user->first_name ?? '', $locale);
                }
            } else {
                $this->sendStrangeWelcome($chatId, false, $locale);
            }

            return;
        }

        $invite = StartInvite::query()->where('token', $startParam)->first();

        if ($invite === null || ! $invite->isUsable()) {
            $this->sendStrangeWelcome($chatId, expired: $invite !== null, locale: $locale);

            return;
        }

        DB::transaction(function () use ($invite, $user): void {
            $invite = StartInvite::query()->whereKey($invite->id)->lockForUpdate()->first();
            if ($invite === null || ! $invite->isUsable()) {
                return;
            }

            $alreadyUsed = StartInviteUse::query()
                ->where('invite_id', $invite->id)
                ->where('user_id', $user->id)
                ->exists();

            if (! $alreadyUsed) {
                StartInviteUse::query()->create([
                    'invite_id' => $invite->id,
                    'user_id' => $user->id,
                ]);
                $invite->increment('times_used');
            }

            $user->is_strange = false;
            if ($invite->kind === StartInvite::KIND_MODEL) {
                $user->role = UserRole::Model;
            }
            $user->save();
        });

        if ($invite->kind === StartInvite::KIND_MODEL) {
            $this->sendModelInviteWelcome($chatId, $user->first_name ?? '', $locale);

            return;
        }

        $this->sendVerifiedWelcome($chatId, $user->first_name ?? '', $locale);
    }

    private function upsertUser(int $telegramId, int $chatId, array $tgFrom): User
    {
        return DB::transaction(function () use ($telegramId, $chatId, $tgFrom): User {
            /** @var User $user */
            $user = User::query()->lockForUpdate()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name' => (string) ($tgFrom['first_name'] ?? 'User'),
                    'last_name' => isset($tgFrom['last_name']) ? (string) $tgFrom['last_name'] : null,
                    'username' => isset($tgFrom['username']) ? (string) $tgFrom['username'] : null,
                    'language_code' => isset($tgFrom['language_code']) ? (string) $tgFrom['language_code'] : null,
                    'role' => UserRole::Client,
                    'status' => UserStatus::Active,
                    'tg_chat_id' => $chatId,
                ],
            );

            $dirty = false;
            if ($user->tg_chat_id !== $chatId) {
                $user->tg_chat_id = $chatId;
                $dirty = true;
            }
            if (isset($tgFrom['username']) && $user->username !== (string) $tgFrom['username']) {
                $user->username = (string) $tgFrom['username'];
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }

            return $user;
        });
    }

    private function sendStrangeWelcome(int $chatId, bool $expired = false, string $locale = 'ru'): void
    {
        $text = trans($expired ? 'start.strange_expired' : 'start.strange_welcome', [], $locale);

        $this->bot->sendMessage($chatId, $text);
    }

    private function sendVerifiedWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.verified', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/home',
            buttonLabel: trans('start.open_app', [], $locale),
        );
    }

    private function sendModelWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.model', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/home',
            buttonLabel: trans('start.open_app', [], $locale),
        );
    }

    private function sendModelInviteWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.model_invite', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/become-model',
            buttonLabel: trans('start.become_model', [], $locale),
        );
    }

    /** Localized "Hi, Name! " / "Hi! " prefix. */
    private function greeting(string $firstName, string $locale): string
    {
        return $firstName !== ''
            ? trans('start.greeting_named', ['name' => $firstName], $locale)
            : trans('start.greeting', [], $locale);
    }

    /** Map a user's stored Telegram/app language to a supported locale. */
    private function localeFor(User $user): string
    {
        $code = strtolower((string) ($user->language_code ?? ''));

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
