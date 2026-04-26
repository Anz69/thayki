<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bumps `users.last_seen_at` on each authenticated API hit, throttled per
 * user via the cache so we don't write on every request.
 *
 * Why throttled
 *   Mini-App pages poll `/auth/me`, `/wallet`, `/meetings/latest`, etc. on
 *   every focus/visibility change — a naive UPDATE on every request would
 *   thrash the row and contend with chat writes. A 60-second cache key per
 *   user keeps it cheap and "live enough" for the chat-presence pill.
 *
 * Failure mode
 *   Best-effort. We never throw from here — a touch failing must never break
 *   the actual request.
 */
class TouchLastSeen
{
    /** Don't write more than once per user every N seconds. */
    private const THROTTLE_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $user = $request->user();
            if (! $user instanceof User) {
                return $response;
            }

            $cacheKey = "touch:last_seen:{$user->id}";
            // ::add returns true only if the key didn't exist — so this whole
            // block runs at most once every THROTTLE_SECONDS per user.
            if (Cache::add($cacheKey, 1, self::THROTTLE_SECONDS)) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['last_seen_at' => now()]);
            }
        } catch (\Throwable) {
            // never break the response over presence bookkeeping
        }

        return $response;
    }
}
