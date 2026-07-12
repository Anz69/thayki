<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\StartInvite;
use App\Models\StartInviteUse;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
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

        // Ask for a language first — for EVERY new client, including those arriving with
        // an invite token. The start param (invite token, if any) is stashed and applied
        // right after the user picks a language.
        if (! $user->language_chosen) {
            $this->stashPendingStart($user->id, $startParam);
            $this->promptLanguage($chatId);

            return;
        }

        $this->markWelcomed($user);
        $this->processStart($chatId, $user, $startParam);
    }

    // Apply the /start payload (invite token or plain start) and send the matching
    // welcome. Called after the language is known — either immediately (language already
    // chosen) or from chooseLanguage() once the user has picked one.
    private function processStart(int $chatId, User $user, ?string $startParam): void
    {
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

    private function stashPendingStart(int $userId, ?string $startParam): void
    {
        $key = 'tg:pending_start:'.$userId;
        if ($startParam === null || $startParam === '') {
            Cache::forget($key);

            return;
        }
        Cache::put($key, $startParam, now()->addHour());
    }

    private function takePendingStart(int $userId): ?string
    {
        return Cache::pull('tg:pending_start:'.$userId);
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

        // Now that the language is chosen, apply whatever /start payload they arrived
        // with (invite token stashed before the prompt) and send the matching welcome.
        $this->processStart($chatId, $user, $this->takePendingStart($user->id));
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
            pin: true,
        );
    }

    private function sendModelWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.model', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/',
            buttonLabel: trans('start.open_app', [], $locale),
            pin: true,
        );
    }

    private function sendModelInviteWelcome(int $chatId, string $firstName, string $locale = 'ru'): void
    {
        $this->bot->sendMessage(
            $chatId,
            trans('start.model_invite', ['greeting' => $this->greeting($firstName, $locale)], $locale),
            openPath: '/',
            buttonLabel: trans('start.become_model', [], $locale),
            pin: true,
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

        $who = (string) ($admin->email ?? $admin->name ?? 'администратор');
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
