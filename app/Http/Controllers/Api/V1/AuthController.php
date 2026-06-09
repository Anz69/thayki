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
        /** @var User $user */
        $user = $request->user();

        return ApiResponse::ok(new UserResource($user->loadMissing('modelProfile', 'wallet')));
    }

    /**
     * Called by the Mini App right after the user grants write access
     * (Telegram requestWriteAccess). The bot can now message them, so send the
     * appropriate welcome — strange users get the strange stub, verified users
     * the full welcome. Deduped so repeated pings don't spam the user.
     */
    public function writeAccessGranted(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! Cache::add('write_access_welcome:'.$user->id, 1, now()->addHours(24))) {
            return ApiResponse::ok(['sent' => false]);
        }

        try {
            StartHandler::default()->sendWelcomeFor($user);
        } catch (\Throwable $e) {
            Log::warning('[AuthController@writeAccessGranted] failed to send welcome', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::ok(['sent' => false]);
        }

        return ApiResponse::ok(['sent' => true]);
    }

    public function logout(Request $request, AuditLogger $audit): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $token = $user->currentAccessToken();

        if ($token !== null && method_exists($token, 'delete')) {
            $token->delete();
        }

        $audit->log('auth.logout', $user, $user);

        return ApiResponse::ok(['ok' => true]);
    }
}
