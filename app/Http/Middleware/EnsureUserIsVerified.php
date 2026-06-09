<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hard server-side gate for the "double-bottom" flow.
 *
 * Even though the SPA routes a strange (unverified) user to /welcome and
 * blocks UI navigation, an attacker can hit the API directly with a valid
 * Sanctum token and skip the gate entirely. This middleware closes that
 * gap: any authenticated request from a strange user is rejected with
 * 403 USER_NOT_VERIFIED unless the route is in the small allowlist needed
 * for the welcome screen itself to function (auth + profile read +
 * notifications toggle).
 *
 * Routes are matched by name when available so we don't have to maintain
 * a brittle regex against URLs.
 */
class EnsureUserIsVerified
{
    /**
     * Whitelist of route names that strange users may still hit. Anything
     * not in this list gets 403'd. Keep this list MINIMAL — it's the
     * compromise zone where strange users can still talk to the API.
     *
     * @var list<string>
     */
    private const ALLOWED_ROUTES = [
        'auth.telegram',
        'auth.me',
        'auth.logout',
        // Strange users are exactly who needs this — on granting write access
        // the bot sends them the strange welcome. Without it the ping 403'd and
        // no message was ever sent.
        'auth.write-access',
        'me.profile',
        'me.update',
    ];

    /**
     * URL prefixes that are safe regardless of the authenticated user
     * being strange. The Telegram webhook is unauthenticated anyway, but
     * listing it makes intent obvious.
     *
     * @var list<string>
     */
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
