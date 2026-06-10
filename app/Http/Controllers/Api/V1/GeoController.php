<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GeoController extends Controller
{
    public function city(Request $request): JsonResponse
    {
        $ip = $this->clientIp($request);

        if ($ip === null || $this->isPrivate($ip)) {
            return ApiResponse::ok(['city' => null, 'country' => null]);
        }

        $lang = str_starts_with(strtolower((string) $request->query('lang', 'ru')), 'en') ? 'en' : 'ru';

        $data = Cache::remember("geo:ip:{$ip}:{$lang}", now()->addDay(), function () use ($ip, $lang) {
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

        return ApiResponse::ok($data);
    }

    private function clientIp(Request $request): ?string
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

    private function isPrivate(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) === false;
    }
}
