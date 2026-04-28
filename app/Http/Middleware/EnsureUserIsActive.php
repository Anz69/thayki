<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserStatus;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hard gate that blocks every authenticated API call from a banned user
 * after the fact. Sanctum tokens stay valid until they're explicitly
 * deleted, so without this middleware a user banned in Filament can keep
 * pinging the API as long as they hold their Bearer token.
 *
 * As an extra belt-and-braces, we also delete the current access token
 * on the way out so the next request from the same client falls back to
 * a clean 401 (matches the "your session ended" UX) instead of repeatedly
 * hitting USER_BANNED.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user !== null && $user->status === UserStatus::Banned) {
            try {
                $token = $user->currentAccessToken();
                if ($token !== null && method_exists($token, 'delete')) {
                    $token->delete();
                }
            } catch (\Throwable) {
            }

            return ApiResponse::error('USER_BANNED', 'Учётная запись заблокирована.', null, 403);
        }

        return $next($request);
    }
}
