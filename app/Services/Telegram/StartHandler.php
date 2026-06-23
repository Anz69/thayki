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

    public function handle(int $chatId, array $tgFrom, ?string $startParam): void
    {
        $telegramId = (int) ($tgFrom['id'] ?? 0);
        if ($telegramId <= 0) {
            return;
        }

        if (is_string($startParam) && str_starts_with($startParam, 'adminlink-')) {
            $this->handleAdminLink($chatId, substr($startParam, strlen('adminlink-')));

            return;
        }

        $user = $this->upsertUser($telegramId, $chatId, $tgFrom);

        if (($startParam === null || $startParam === '') && ! $user->language_chosen) {
            $this->promptLanguage($chatId);

            return;
        }

        $this->markWelcomed($user);

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

    public function sendWelcomeFor(User $user): bool
    {
        $chatId = $user->tg_chat_id;
        if ($chatId === null) {
            return false;
        }

        $locale = $this->localeFor($user);

        if ($user->is_strange) {
            $this->sendStrangeWelcome((int) $chatId, false, $locale);

            return true;
        }

        if ($user->role === UserRole::Model) {
            $this->sendModelWelcome((int) $chatId, $user->first_name ?? '', $locale);

            return true;
        }

        $this->sendVerifiedWelcome((int) $chatId, $user->first_name ?? '', $locale);

        return true;
    }

    private function markWelcomed(User $user): void
    {
        if ($user->bot_welcomed) {
            return;
        }
        try {
            $user->forceFill(['bot_welcomed' => true])->save();
        } catch (\Throwable) {

        }
    }

    private function promptLanguage(int $chatId): void
    {
        $this->bot->sendButtons(
            $chatId,
            "👋 <b>Rus-Model Agency</b>\n\n"
                ."🇷🇺 Выберите язык, на котором вам удобно.\n"
                ."🇬🇧 Please choose your preferred language.\n"
                ."🇨🇳 请选择您偏好的语言。",
            [
                [
                    ['text' => '🇷🇺 Русский', 'data' => 'lang:ru'],
                    ['text' => '🇬🇧 English', 'data' => 'lang:en'],
                ],
                [
                    ['text' => '🇨🇳 中文', 'data' => 'lang:zh'],
                ],
            ],
        );
    }

    public function chooseLanguage(int $chatId, array $tgFrom, string $lang): void
    {
        $lang = in_array($lang, ['en', 'zh'], true) ? $lang : 'ru';
        $telegramId = (int) ($tgFrom['id'] ?? 0);
        if ($telegramId <= 0) {
            return;
        }

        $user = $this->upsertUser($telegramId, $chatId, $tgFrom);

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

        $this->markWelcomed($user);

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
                    'is_strange' => true,
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
            openPath: '/',
            buttonLabel: trans('start.become_model', [], $locale),
        );
    }

    private function handleAdminLink(int $chatId, string $token): void
    {
        $twoFactor = app(\App\Services\Admin\AdminTwoFactor::class);
        $admin = $twoFactor->resolveLinkToken($token);

        if ($admin === null) {
            $this->bot->sendMessage($chatId, '🔐 Ссылка для привязки админ-панели устарела или недействительна. Сгенерируйте новую в панели.');

            return;
        }

        $who = (string) ($admin->name ?? $admin->email ?? 'администратор');
        $this->bot->sendButtons(
            $chatId,
            "🔐 <b>Привязка админ-панели</b>\n\nПривязать вход в админку (<b>".e($who)."</b>) к этому Telegram-аккаунту?\n\nПосле привязки сюда будут приходить коды двухфакторной аутентификации.",
            [[
                ['text' => '✅ Да, привязать', 'data' => 'adminlink_ok:'.$token],
                ['text' => '✖ Нет', 'data' => 'adminlink_no:'.$token],
            ]],
        );
    }

    private function greeting(string $firstName, string $locale): string
    {
        return $firstName !== ''
            ? trans('start.greeting_named', ['name' => $firstName], $locale)
            : trans('start.greeting', [], $locale);
    }

    private function localeFor(User $user): string
    {
        $code = strtolower((string) ($user->language_code ?? ''));

        if (str_starts_with($code, 'zh')) {
            return 'zh';
        }

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
