<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\StartInvite;
use App\Models\StartInviteUse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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

    public function bot(): TelegramBotService
    {
        return $this->bot;
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

        // First contact (bare /start, language not yet chosen): ask the user
        // which language they prefer before anything else.
        if (($startParam === null || $startParam === '') && ! $user->language_chosen) {
            $this->promptLanguage($chatId);

            return;
        }

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

    /** Ask the user to pick a language (bilingual prompt + inline buttons). */
    private function promptLanguage(int $chatId): void
    {
        $this->bot->sendButtons(
            $chatId,
            "👋 <b>Rus-Model Agency</b>\n\n"
                ."🇷🇺 Выберите язык, на котором вам удобно.\n"
                ."🇬🇧 Please choose your preferred language.",
            [[
                ['text' => '🇷🇺 Русский', 'data' => 'lang:ru'],
                ['text' => '🇬🇧 English', 'data' => 'lang:en'],
            ]],
        );
    }

    /**
     * Handle a language choice from the inline keyboard: persist it and then
     * continue with the normal welcome.
     *
     * @param  array  $tgFrom  Telegram "from" object
     */
    public function chooseLanguage(int $chatId, array $tgFrom, string $lang): void
    {
        $lang = $lang === 'en' ? 'en' : 'ru';
        $telegramId = (int) ($tgFrom['id'] ?? 0);
        if ($telegramId <= 0) {
            return;
        }

        $user = $this->upsertUser($telegramId, $chatId, $tgFrom);

        // Persist the choice. Guard `language_chosen` so a server that hasn't run
        // the migration yet still saves the language_code (the part that actually
        // drives localization) instead of throwing and saving nothing.
        $attrs = ['language_code' => $lang];
        if (Schema::hasColumn('users', 'language_chosen')) {
            $attrs['language_chosen'] = true;
        }
        try {
            $user->forceFill($attrs)->save();
        } catch (\Throwable $e) {
            Log::error('[StartHandler] failed to save language choice', [
                'telegram_id' => $telegramId,
                'lang' => $lang,
                'error' => $e->getMessage(),
            ]);
        }

        if (! $user->is_strange) {
            if ($user->role === UserRole::Model) {
                $this->sendModelWelcome($chatId, $user->first_name ?? '', $lang);
            } else {
                $this->sendVerifiedWelcome($chatId, $user->first_name ?? '', $lang);
            }
        } else {
            $this->sendStrangeWelcome($chatId, false, $lang);
        }
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
                    'is_strange' => true, // unverified until an invite flips it
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
        $text = trans(
            $expired ? 'start.strange_expired' : 'start.strange_welcome',
            ['chat' => (string) config('telegram.public_chat', '@RusModelChat')],
            $locale,
        );

        $this->bot->sendMessage($chatId, $text);
    }

    private function sendVerifiedWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.verified', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/',
            buttonLabel: trans('start.open_app', [], $locale),
        );
    }

    private function sendModelWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.model', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/',
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
