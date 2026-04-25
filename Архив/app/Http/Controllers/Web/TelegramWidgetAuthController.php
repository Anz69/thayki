<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Handles authentication via the Telegram Login Widget
 * (https://core.telegram.org/widgets/login).
 *
 * The widget POSTs: id, first_name, last_name?, username?, photo_url?,
 *                   auth_date, hash
 *
 * Validation follows the official spec:
 *   1. Build check_string = sorted key=value pairs joined by \n (excluding hash)
 *   2. secret_key = SHA-256(bot_token) — NOT hex, raw binary
 *   3. expected_hash = HMAC-SHA256(check_string, secret_key)
 *   4. Compare with hash using constant-time comparison
 */
class TelegramWidgetAuthController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        // Already authenticated
        if (Auth::check()) {
            return response()->json(['ok' => true, 'user' => $this->formatUser(Auth::user())]);
        }

        $data = $request->only(['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash']);

        if (empty($data['hash']) || empty($data['id']) || empty($data['auth_date'])) {
            return response()->json(['ok' => false, 'error' => 'Invalid widget data'], 422);
        }

        // Allow unsigned in dev (mirrors the Mini App config flag)
        $allowUnsigned = (bool) config('services.telegram.allow_unsigned', false);

        if (! $allowUnsigned && ! $this->validateHash($data)) {
            return response()->json(['ok' => false, 'error' => 'Invalid hash'], 401);
        }

        // Reject stale auth (older than 1 day)
        if (! $allowUnsigned && (time() - (int) $data['auth_date']) > 86400) {
            return response()->json(['ok' => false, 'error' => 'Auth data expired'], 401);
        }

        $telegramId = (int) $data['id'];

        /** @var User $user */
        $user = DB::transaction(function () use ($data, $telegramId): User {
            /** @var User $user */
            $user = User::query()->lockForUpdate()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name' => (string) $data['first_name'],
                    'last_name'  => $data['last_name'] ?? null,
                    'username'   => $data['username']  ?? null,
                    'photo_url'  => $data['photo_url'] ?? null,
                    'role'       => UserRole::Client,
                    'status'     => UserStatus::Active,
                ],
            );

            $user->fill([
                'first_name'   => (string) $data['first_name'],
                'last_name'    => $data['last_name'] ?? $user->last_name,
                'username'     => $data['username']  ?? $user->username,
                'photo_url'    => $user->photo_customized
                    ? $user->photo_url
                    : ($data['photo_url'] ?? $user->photo_url),
                'last_auth_at' => now(),
            ])->save();

            Wallet::query()->firstOrCreate(
                ['user_id' => $user->id],
                ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
            );

            return $user;
        });

        if ($user->status === UserStatus::Banned) {
            return response()->json(['ok' => false, 'error' => 'Account banned'], 403);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return response()->json(['ok' => true, 'user' => $this->formatUser($user)]);
    }

    private function validateHash(array $data): bool
    {
        $botToken = config('services.telegram.bot_token', '');
        if ($botToken === '') {
            return false;
        }

        $receivedHash = $data['hash'];

        // Build check string (all fields except hash, sorted alphabetically)
        $checkData = $data;
        unset($checkData['hash']);
        ksort($checkData);
        $checkString = implode("\n", array_map(
            static fn ($k, $v) => "$k=$v",
            array_keys($checkData),
            $checkData,
        ));

        // secret key is SHA-256 of the bot token (raw binary output)
        $secretKey     = hash('sha256', $botToken, true);
        $expectedHash  = hash_hmac('sha256', $checkString, $secretKey);

        return hash_equals($expectedHash, $receivedHash);
    }

    /** @return array<string, mixed> */
    private function formatUser(User $user): array
    {
        return [
            'id'         => $user->id,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'username'   => $user->username,
            'photo_url'  => $user->photo_url,
            'role'       => $user->role->value,
            'is_premium' => $user->is_premium,
        ];
    }
}
