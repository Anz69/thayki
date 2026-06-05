<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Exceptions\InvalidInitDataException;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Audit\AuditLogger;
use App\Services\Telegram\InitDataValidator;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\NewAccessToken;

/**
 * End-to-end Telegram Mini App login use-case.
 *
 * 1) Validate initData (HMAC + auth_date + user payload).
 * 2) Anti-replay via cache: one-shot lock on the initData hash.
 * 3) Upsert the user record and its wallet.
 * 4) Issue a Sanctum token scoped to the user's role.
 *
 * NOTE on `is_strange`:
 *   New users created here default to is_strange=true (the column default).
 *   They stay strange and see only the welcome stub until they /start the
 *   bot via a 'verify' invite-link, which flips the flag (see
 *   App\Services\Telegram\StartHandler). This is the gate for the
 *   double-bottom flow — direct Mini App access never grants verification.
 */
class AuthenticateTelegramUserAction
{
    public function __construct(
        private readonly InitDataValidator $validator,
        private readonly CacheRepository $cache,
        private readonly ConfigRepository $config,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array{user: User, token: NewAccessToken}
     */
    public function execute(string $rawInitData): array
    {
        $validated = $this->validator->validate($rawInitData);

        $replayKey  = (string) $this->config->get('telegram.replay_cache_prefix', 'tg:initdata:').$validated['hash'];
        $replayTtl  = (int) $this->config->get('telegram.replay_cache_ttl', 60);

        if (! $this->cache->add($replayKey, 1, $replayTtl)) {
            $replayTelegramId = (int) ($validated['user']['id'] ?? 0);
            $existingUser = $replayTelegramId > 0
                ? User::query()->where('telegram_id', $replayTelegramId)->first()
                : null;

            if ($existingUser !== null && $existingUser->status !== UserStatus::Banned) {
                logger()->info('[AuthenticateTelegramUserAction] initData replay accepted as idempotent retry', [
                    'replay_key' => $replayKey,
                    'telegram_id' => $replayTelegramId,
                ]);
                // Local dev test accounts are always verified.
                if ($this->config->get('app.env') === 'local' && $existingUser->is_strange !== false) {
                    $existingUser->is_strange = false;
                    $existingUser->save();
                }
                $token = $existingUser->createToken(
                    name: 'mini-app',
                    abilities: ['role:' . $existingUser->role->value],
                );
                return ['user' => $existingUser, 'token' => $token];
            }

            throw InvalidInitDataException::replay();
        }

        $payload = $validated['user'];
        $telegramId = (int) $payload['id'];

        /** @var User $user */
        $user = DB::transaction(function () use ($payload, $telegramId): User {
            /** @var User $user */
            $user = User::query()->lockForUpdate()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name' => (string) $payload['first_name'],
                    'last_name' => isset($payload['last_name']) ? (string) $payload['last_name'] : null,
                    'username' => isset($payload['username']) ? (string) $payload['username'] : null,
                    'language_code' => isset($payload['language_code']) ? (string) $payload['language_code'] : null,
                    'photo_url' => isset($payload['photo_url']) ? (string) $payload['photo_url'] : null,
                    'role' => UserRole::Client,
                    'status' => UserStatus::Active,
                    'tg_chat_id' => $telegramId,
                ],
            );

            $user->fill([
                'first_name' => (string) $payload['first_name'],
                'last_name' => isset($payload['last_name']) ? (string) $payload['last_name'] : $user->last_name,
                'username' => isset($payload['username']) ? (string) $payload['username'] : $user->username,
                'language_code' => isset($payload['language_code']) ? (string) $payload['language_code'] : $user->language_code,
                'photo_url' => $user->photo_customized
                    ? $user->photo_url
                    : (isset($payload['photo_url']) ? (string) $payload['photo_url'] : $user->photo_url),
                'tg_chat_id' => $user->tg_chat_id ?? $telegramId,
                'last_auth_at' => now(),
            ])->save();

            Wallet::query()->firstOrCreate(
                ['user_id' => $user->id],
                ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
            );

            // Local dev test accounts are always verified — skip the welcome stub.
            // NB: on a fresh firstOrCreate the in-memory is_strange is null (the
            // DB default applies server-side), so force-set rather than guard on it.
            if ($this->config->get('app.env') === 'local' && $user->is_strange !== false) {
                $user->is_strange = false;
                $user->save();
            }

            return $user;
        });

        if ($user->status === UserStatus::Banned) {
            throw DomainException::forbidden('USER_BANNED', 'This account has been banned.');
        }

        $token = $user->createToken(
            name: 'mini-app',
            abilities: ['role:'.$user->role->value],
        );

        $this->audit->log('auth.login', $user, $user, [
            'telegram_id' => $user->telegram_id,
            'is_strange' => $user->is_strange,
        ]);

        return ['user' => $user, 'token' => $token];
    }
}
