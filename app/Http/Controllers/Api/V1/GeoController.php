<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\IpGeo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    public function city(Request $request): JsonResponse
    {
        $ip = IpGeo::clientIp($request);

        return ApiResponse::ok(IpGeo::resolve($ip, (string) $request->query('lang', 'ru')));
    }
}
