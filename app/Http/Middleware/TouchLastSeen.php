<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\IpGeo;
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
                $update = ['last_seen_at' => now()];

                // Refresh geo only when the IP changed (geo lookups are cached per IP).
                $ip = IpGeo::clientIp($request);
                if ($ip !== null && $ip !== $user->last_ip) {
                    $update['last_ip'] = $ip;
                    $geo = IpGeo::resolve($ip);
                    $update['country'] = $geo['country'];
                    $update['city'] = $geo['city'];
                }

                DB::table('users')->where('id', $user->id)->update($update);
            }
        } catch (\Throwable) {
        }

        return $response;
    }
}
