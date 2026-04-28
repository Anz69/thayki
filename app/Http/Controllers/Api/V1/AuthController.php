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

        $browserToken = (string) $request->input('browser_token', '');
        if ($browserToken !== '') {
            Cache::put('browser_auth:' . $browserToken, $result['user']->id, now()->addMinutes(5));
        }

        try {
            Auth::login($result['user'], remember: true);
            $request->session()->regenerate();
        } catch (\Throwable) {
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
