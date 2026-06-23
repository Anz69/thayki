<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\AdminUser;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AdminTwoFactor
{
    public function __construct(private readonly TelegramBotService $bot) {}

    /* ----------------------------- Binding ------------------------------ */

    /** Create a one-time token that links a Telegram chat to this admin. */
    public function createLinkToken(AdminUser $admin): string
    {
        $token = Str::lower(Str::random(24));
        Cache::put($this->linkKey($token), $admin->id, now()->addMinutes(10));

        return $token;
    }

    public function resolveLinkToken(string $token): ?AdminUser
    {
        $id = Cache::get($this->linkKey($token));

        return $id ? AdminUser::query()->find($id) : null;
    }

    public function consumeLinkToken(string $token): void
    {
        Cache::forget($this->linkKey($token));
    }

    public function bind(AdminUser $admin, int $chatId): void
    {
        $admin->forceFill(['tg_chat_id' => $chatId])->save();
    }

    public function unbind(AdminUser $admin): void
    {
        $admin->forceFill(['tg_chat_id' => null])->save();
    }

    /* ------------------------------ Codes ------------------------------- */

    /** Generate a fresh code, store it, and send it to the admin's Telegram. */
    public function sendCode(AdminUser $admin, ?string $ip): bool
    {
        if (! $admin->tg_chat_id) {
            return false;
        }

        $code = (string) random_int(100000, 999999);
        Cache::put($this->codeKey($admin), $code, now()->addSeconds((int) config('admin.twofactor.code_ttl', 300)));

        $ip = $ip !== null && $ip !== '' ? $ip : '—';
        $when = now()->format('d.m.Y H:i').' UTC';
        $text = "🔐 <b>Вход в админ-панель</b>\n\n"
            ."IP: <code>".e($ip)."</code>\n"
            ."Время: {$when}\n\n"
            ."Код подтверждения: <code>{$code}</code>\n\n"
            ."Если это были не вы — никому не сообщайте код.";

        return $this->bot->sendMessage((int) $admin->tg_chat_id, $text);
    }

    public function verify(AdminUser $admin, string $code): bool
    {
        $stored = Cache::get($this->codeKey($admin));
        if ($stored === null) {
            return false;
        }
        if (! hash_equals((string) $stored, trim($code))) {
            return false;
        }
        Cache::forget($this->codeKey($admin));

        return true;
    }

    private function linkKey(string $token): string
    {
        return 'admin:2fa:link:'.$token;
    }

    private function codeKey(AdminUser $admin): string
    {
        return 'admin:2fa:code:'.$admin->id;
    }
}
