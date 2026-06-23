<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class IpGeo
{
    /**
     * Best-effort client IP, honouring Cloudflare / proxy headers.
     */
    public static function clientIp(Request $request): ?string
    {
        $cf = $request->header('CF-Connecting-IP');
        if (is_string($cf) && $cf !== '') {
            return trim($cf);
        }
        $fwd = $request->header('X-Forwarded-For');
        if (is_string($fwd) && $fwd !== '') {
            $first = trim(explode(',', $fwd)[0]);
            if ($first !== '') {
                return $first;
            }
        }

        return $request->ip();
    }

    public static function isPublic(?string $ip): bool
    {
        if ($ip === null || $ip === '') {
            return false;
        }

        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    /**
     * Resolve a public IP to ['city' => ?string, 'country' => ?string]. Cached
     * for a day per ip+lang. Returns nulls for private/unresolvable IPs.
     */
    public static function resolve(?string $ip, string $lang = 'ru'): array
    {
        if (! self::isPublic($ip)) {
            return ['city' => null, 'country' => null];
        }

        $lang = str_starts_with(strtolower($lang), 'en') ? 'en' : 'ru';

        return Cache::remember("geo:ip:{$ip}:{$lang}", now()->addDay(), function () use ($ip, $lang): array {
            try {
                $res = Http::timeout(3)->get("https://ipwho.is/{$ip}", [
                    'fields' => 'success,city,country',
                    'lang' => $lang,
                ]);
                if ($res->ok() && $res->json('success') === true) {
                    $city = trim((string) $res->json('city'));

                    return [
                        'city' => $city !== '' ? $city : null,
                        'country' => $res->json('country') ?: null,
                    ];
                }
            } catch (\Throwable) {
            }

            return ['city' => null, 'country' => null];
        });
    }
}
