<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Auth\AuthenticateTelegramUserAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginTelegramRequest;
use App\Http\Resources\UserResource;
use App\Models\StartInvite;
use App\Models\StartInviteUse;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Telegram\StartHandler;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(LoginTelegramRequest $request, AuthenticateTelegramUserAction $action): JsonResponse
    {
        $result = $action->execute((string) $request->input('init_data'));

        $browserToken = (string) $request->input('browser_token', '');
        if ($browserToken !== '') {
            Cache::put('browser_auth:'.$browserToken, $result['user']->id, now()->addMinutes(5));
        }

        $inviteToken = (string) $request->input('invite_token', '');
        if ($inviteToken !== '') {
            $this->tryApplyInvite($result['user'], $inviteToken);
            $result['user']->refresh();
        }

        try {
            Auth::login($result['user'], remember: true);
            $request->session()->regenerate();
        } catch (\Throwable $e) {
            Log::warning('[AuthController@login] session login failed', [
                'user_id' => $result['user']->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }

        return ApiResponse::ok([
            'token' => $result['token']->plainTextToken,
            'user' => (new UserResource($result['user']))->resolve(),
            'role' => $result['user']->role->value,
        ], status: 200);
    }

    private function tryApplyInvite(User $user, string $token): void
    {
        try {
            $invite = StartInvite::query()->where('token', $token)->first();
            if ($invite === null || ! $invite->isUsable()) {
                Log::info('[AuthController@tryApplyInvite] invite missing or unusable', [
                    'user_id' => $user->id,
                    'token_tail' => substr($token, -8),
                ]);

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
        } catch (\Throwable $e) {
            Log::warning('[AuthController@tryApplyInvite] failed', [
                'user_id' => $user->id,
                'token_tail' => substr($token, -8),
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function me(Request $request): JsonResponse
    {

        $user = $request->user();

        return ApiResponse::ok(new UserResource($user->loadMissing('modelProfile')));
    }

    public function sync(Request $request, \App\Services\Telegram\InitDataValidator $validator): JsonResponse
    {
        $user = $request->user();
        $raw = (string) $request->input('init_data', '');

        // Returning users resume via a stored token and never re-run the Telegram
        // login action, so profile fields (username, name, photo) would never
        // refresh after the user changes them on Telegram. Re-validate the live
        // initData here and sync — best-effort, never breaking the session.
        if ($raw !== '') {
            try {
                $validated = $validator->validate($raw);
                $payload = $validated['user'] ?? [];

                if ((int) ($payload['id'] ?? 0) === (int) $user->telegram_id) {
                    $user->fill([
                        'first_name' => isset($payload['first_name']) ? (string) $payload['first_name'] : $user->first_name,
                        'last_name' => isset($payload['last_name']) ? (string) $payload['last_name'] : $user->last_name,
                        'username' => isset($payload['username']) ? (string) $payload['username'] : $user->username,
                        'language_code' => $user->language_chosen
                            ? $user->language_code
                            : (isset($payload['language_code']) ? (string) $payload['language_code'] : $user->language_code),
                        'photo_url' => $user->photo_customized
                            ? $user->photo_url
                            : (isset($payload['photo_url']) ? (string) $payload['photo_url'] : $user->photo_url),
                    ]);

                    if ($user->isDirty()) {
                        $user->save();
                    }
                }
            } catch (\Throwable) {
            }
        }

        return ApiResponse::ok(new UserResource($user->loadMissing('modelProfile')));
    }

    public function writeAccessGranted(Request $request): JsonResponse
    {

        $user = $request->user();

        if ($user->bot_welcomed) {
            return ApiResponse::ok(['sent' => false]);
        }

        try {
            $sent = StartHandler::default()->sendWelcomeFor($user);
        } catch (\Throwable $e) {
            Log::warning('[AuthController@writeAccessGranted] failed to send welcome', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::ok(['sent' => false]);
        }

        if ($sent) {
            $user->forceFill(['bot_welcomed' => true])->save();
        }

        return ApiResponse::ok(['sent' => $sent]);
    }

    public function logout(Request $request, AuditLogger $audit): JsonResponse
    {

        $user = $request->user();
        $token = $user->currentAccessToken();

        if ($token !== null && method_exists($token, 'delete')) {
            $token->delete();
        }

        $audit->log('auth.logout', $user, $user);

        return ApiResponse::ok(['ok' => true]);
    }
}
