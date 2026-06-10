<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Pagination\AbstractPaginator;

final class ApiResponse
{

    public static function ok(mixed $data = null, ?array $meta = null, int $status = 200): JsonResponse
    {
        [$payload, $resolvedMeta] = self::resolveDataAndMeta($data, $meta);

        $body = ['ok' => true, 'data' => $payload];

        if ($resolvedMeta !== null && $resolvedMeta !== []) {
            $body['meta'] = $resolvedMeta;
        }

        return response()->json($body, $status);
    }

    public static function created(mixed $data = null): JsonResponse
    {
        return self::ok($data, null, 201);
    }

    public static function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    public static function error(string $code, string $message, ?array $details = null, int $status = 400): JsonResponse
    {
        $error = [
            'code' => $code,
            'message' => $message,
        ];

        if ($details !== null && $details !== []) {
            $error['details'] = $details;
        }

        return response()->json([
            'ok' => false,
            'error' => $error,
        ], $status);
    }

    private static function resolveDataAndMeta(mixed $data, ?array $meta): array
    {
        if ($data instanceof ResourceCollection) {
            $response = $data->response()->getData(true);
            $payload = $response['data'] ?? [];
            $resolvedMeta = $meta ?? [];
            if (isset($response['links'])) {
                $resolvedMeta['links'] = $response['links'];
            }
            if (isset($response['meta'])) {
                $resolvedMeta['pagination'] = $response['meta'];
            }

            return [$payload, $resolvedMeta];
        }

        if ($data instanceof JsonResource) {
            return [$data->resolve(), $meta];
        }

        if ($data instanceof AbstractPaginator) {
            $meta ??= [];
            $meta['pagination'] = [
                'page' => $data->currentPage(),
                'per_page' => $data->perPage(),
                'total' => method_exists($data, 'total') ? $data->total() : null,
                'last_page' => method_exists($data, 'lastPage') ? $data->lastPage() : null,
            ];

            return [$data->items(), $meta];
        }

        if ($data instanceof Arrayable) {
            return [$data->toArray(), $meta];
        }

        return [$data, $meta];
    }
}
