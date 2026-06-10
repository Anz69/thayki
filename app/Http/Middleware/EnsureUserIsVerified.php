<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsVerified
{

    private const ALLOWED_ROUTES = [
        'auth.telegram',
        'auth.me',
        'auth.logout',

        'auth.write-access',
        'me.profile',
        'me.update',
    ];

    private const ALLOWED_URL_PREFIXES = [
        'telegram/webhook',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null || ! $user->is_strange) {
            return $next($request);
        }

        foreach (self::ALLOWED_URL_PREFIXES as $prefix) {
            if (str_starts_with(ltrim($request->path(), '/'), $prefix)) {
                return $next($request);
            }
        }

        $routeName = optional($request->route())->getName();
        if ($routeName !== null && in_array($routeName, self::ALLOWED_ROUTES, true)) {
            return $next($request);
        }

        return ApiResponse::error(
            'USER_NOT_VERIFIED',
            'Доступ ограничен. Подключитесь через invite-ссылку, чтобы продолжить.',
            null,
            403,
        );
    }
}
