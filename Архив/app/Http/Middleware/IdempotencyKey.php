<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\IdempotencyConflictException;
use App\Models\IdempotencyKey as IdempotencyKeyModel;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Persists the first successful response for (user_id, idempotency_key) and
 * replays it on retries with the same request body. Conflicting bodies
 * for the same key return 409 IDEMPOTENCY_CONFLICT.
 *
 * Only POST/PATCH/PUT/DELETE are guarded; safe methods pass through.
 * Header: Idempotency-Key.
 */
class IdempotencyKey
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->getMethod(), ['POST', 'PATCH', 'PUT', 'DELETE'], true)) {
            return $next($request);
        }

        $key = (string) $request->header('Idempotency-Key', '');

        if ($key === '') {
            return $next($request);
        }

        $user = $request->user();
        if (! $user instanceof User) {
            return $next($request);
        }

        if (! preg_match('/^[A-Za-z0-9_\-]{8,128}$/', $key)) {
            return $next($request);
        }

        $requestHash = hash('sha256', (string) $request->getContent());

        $existing = IdempotencyKeyModel::query()
            ->where('user_id', $user->id)
            ->where('key', $key)
            ->first();

        if ($existing !== null) {
            if ($existing->expires_at->isPast()) {
                $existing->delete();
            } else {
                if ($existing->request_hash !== $requestHash) {
                    throw new IdempotencyConflictException;
                }

                return response()->json(
                    $existing->response,
                    $existing->status_code ?? 200,
                );
            }
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response instanceof JsonResponse && $response->isSuccessful()) {
            $ttl = (int) config('app.idempotency_ttl', env('IDEMPOTENCY_TTL', 86400));
            DB::transaction(function () use ($user, $key, $requestHash, $response, $request, $ttl): void {
                IdempotencyKeyModel::query()->updateOrCreate(
                    ['user_id' => $user->id, 'key' => $key],
                    [
                        'request_hash' => $requestHash,
                        'method' => $request->getMethod(),
                        'path' => $request->path(),
                        'response' => $response->getData(true),
                        'status_code' => $response->getStatusCode(),
                        'expires_at' => Carbon::now()->addSeconds($ttl),
                    ],
                );
            });
        }

        return $response;
    }
}
