<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserStatus;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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
