<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Auth\AuthenticateTelegramUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginTelegramRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class AuthController extends Controller
{
    public function login(LoginTelegramRequest $request, AuthenticateTelegramUserAction $action): JsonResponse
    {
        $result = $action->execute((string) $request->input('init_data'));

        // Browser deep-link flow: the Mini App passes a short-lived token so
        // the desktop browser tab can poll and get authenticated.
        $browserToken = (string) $request->input('browser_token', '');
        if ($browserToken !== '') {
            Cache::put('browser_auth:' . $browserToken, $result['user']->id, now()->addMinutes(5));
        }

        // Best-effort: also start a web session so Inertia shared props (auth.user)
        // are populated on the next page load — avoids an extra /auth/me round-trip.
        // This is optional: the Bearer token is the primary auth mechanism.
        try {
            Auth::login($result['user'], remember: true);
            $request->session()->regenerate();
        } catch (\Throwable) {
            // Session not available (e.g. domain not in SANCTUM_STATEFUL_DOMAINS)
            // Token-based auth is fully sufficient without a session.
        }

        return ApiResponse::ok([
            'token' => $result['token']->plainTextToken,
            'user'  => (new UserResource($result['user']))->resolve(),
            'role'  => $result['user']->role->value,
        ], status: 200);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return ApiResponse::ok(new UserResource($user->loadMissing('modelProfile', 'wallet')));
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
