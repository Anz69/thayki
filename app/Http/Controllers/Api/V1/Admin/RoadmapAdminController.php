<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoadmapStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Roadmap\StoreRoadmapItemRequest;
use App\Http\Resources\RoadmapItemResource;
use App\Models\RoadmapItem;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapAdminController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function store(StoreRoadmapItemRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['status'] = RoadmapStatus::from((string) ($payload['status'] ?? RoadmapStatus::Planned->value));
        $payload['position'] = $payload['position'] ?? 0;

        /** @var RoadmapItem $item */
        $item = RoadmapItem::query()->create($payload);
        $this->audit->log('roadmap.created', $request->user(), $item, ['title' => $item->title]);

        return ApiResponse::created(new RoadmapItemResource($item));
    }

    public function update(StoreRoadmapItemRequest $request, RoadmapItem $item): JsonResponse
    {
        $payload = $request->validated();
        if (isset($payload['status'])) {
            $payload['status'] = RoadmapStatus::from((string) $payload['status']);
        }

        $item->fill($payload)->save();
        $this->audit->log('roadmap.updated', $request->user(), $item, $payload);

        return ApiResponse::ok(new RoadmapItemResource($item));
    }

    public function destroy(Request $request, RoadmapItem $item): JsonResponse
    {
        $this->audit->log('roadmap.deleted', $request->user(), $item, ['title' => $item->title]);
        $item->delete();

        return ApiResponse::noContent();
    }
}
