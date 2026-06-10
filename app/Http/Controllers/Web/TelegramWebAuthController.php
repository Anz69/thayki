<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\InvalidInitDataException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Telegram\InitDataValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TelegramWebAuthController extends Controller
{
    public function __construct(private readonly InitDataValidator $validator) {}

    public function handle(Request $request): JsonResponse
    {
        if (Auth::check()) {

            $user = Auth::user();

            return response()->json([
                'ok'   => true,
                'user' => $this->formatUser($user),
            ]);
        }

        $initData = (string) $request->input('init_data', '');

        if ($initData === '') {
            return response()->json(['ok' => false, 'error' => 'No init_data provided'], 422);
        }

        try {
            $validated = $this->validator->validate($initData);
        } catch (InvalidInitDataException $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 401);
        }

        $payload    = $validated['user'];
        $telegramId = (int) $payload['id'];

        $user = DB::transaction(function () use ($payload, $telegramId): User {

            $user = User::query()->lockForUpdate()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name'    => (string) $payload['first_name'],
                    'last_name'     => isset($payload['last_name']) ? (string) $payload['last_name'] : null,
                    'username'      => isset($payload['username']) ? (string) $payload['username'] : null,
                    'language_code' => isset($payload['language_code']) ? (string) $payload['language_code'] : null,
                    'photo_url'     => isset($payload['photo_url']) ? (string) $payload['photo_url'] : null,
                    'is_premium'    => (bool) ($payload['is_premium'] ?? false),
                    'role'          => UserRole::Client,
                    'status'        => UserStatus::Active,
                ],
            );

            $user->fill([
                'first_name'    => (string) $payload['first_name'],
                'last_name'     => isset($payload['last_name']) ? (string) $payload['last_name'] : $user->last_name,
                'username'      => isset($payload['username']) ? (string) $payload['username'] : $user->username,
                'language_code' => isset($payload['language_code']) ? (string) $payload['language_code'] : $user->language_code,
                'photo_url'     => $user->photo_customized
                    ? $user->photo_url
                    : (isset($payload['photo_url']) ? (string) $payload['photo_url'] : $user->photo_url),
                'is_premium'    => (bool) ($payload['is_premium'] ?? $user->is_premium),
                'last_auth_at'  => now(),
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

        $browserToken = (string) $request->input('browser_token', '');
        if ($browserToken !== '') {
            Cache::put('browser_auth:' . $browserToken, $user->id, now()->addMinutes(5));
        }

        return response()->json([
            'ok'   => true,
            'user' => $this->formatUser($user),
        ]);
    }

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
