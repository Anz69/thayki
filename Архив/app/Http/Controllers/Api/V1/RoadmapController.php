<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoadmapItemResource;
use App\Models\RoadmapItem;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class RoadmapController extends Controller
{
    public function index(): JsonResponse
    {
        $items = RoadmapItem::query()
            ->orderBy('position')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::ok(RoadmapItemResource::collection($items)->resolve());
    }
}
