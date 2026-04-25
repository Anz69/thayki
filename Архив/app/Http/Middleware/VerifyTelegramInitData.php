<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\InvalidInitDataException;
use App\Services\Telegram\InitDataValidator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Extra middleware for endpoints that want to re-verify fresh initData
 * on each call (e.g. write actions outside the Sanctum auth flow).
 *
 * Place ahead of a route and pass initData in the `X-Telegram-Init-Data`
 * header or the `init_data` body field.
 */
class VerifyTelegramInitData
{
    public function __construct(private readonly InitDataValidator $validator) {}

    public function handle(Request $request, Closure $next): Response
    {
        $initData = (string) ($request->header('X-Telegram-Init-Data')
            ?? $request->input('init_data', ''));

        if ($initData === '') {
            throw InvalidInitDataException::malformed('Missing initData.');
        }

        $validated = $this->validator->validate($initData);
        $request->attributes->set('telegram.init_data', $validated);

        return $next($request);
    }
}
