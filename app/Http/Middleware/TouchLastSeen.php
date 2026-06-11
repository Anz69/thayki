<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class TouchLastSeen
{

    private const THROTTLE_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $user = $request->user('sanctum') ?? $request->user();
            if (! $user instanceof User) {
                return $response;
            }

            $cacheKey = "touch:last_seen:{$user->id}";
            if (Cache::add($cacheKey, 1, self::THROTTLE_SECONDS)) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['last_seen_at' => now()]);
            }
        } catch (\Throwable) {
        }

        return $response;
    }
}
