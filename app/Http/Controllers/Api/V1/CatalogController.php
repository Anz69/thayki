<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\MeetingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListModelsRequest;
use App\Http\Resources\ModelProfileResource;
use App\Models\Meeting;
use App\Models\ModelProfile;
use App\Services\Catalog\ModelProfileQuery;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CatalogController extends Controller
{
    public function index(ListModelsRequest $request, ModelProfileQuery $query): JsonResponse
    {

        $filters = $request->validated();

        $paginator = $query->paginate($filters);

        $items = ModelProfileResource::collection($paginator->getCollection());

        return ApiResponse::ok($items->resolve(), [
            'pagination' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {

        $profile = ModelProfile::query()
            ->published()
            ->with(['photos', 'priceOptions'])
            ->find($id);

        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        return ApiResponse::ok(new ModelProfileResource($profile));
    }

    public function bookedSlots(Request $request, int $id): JsonResponse
    {
        $profile = ModelProfile::query()->published()->find($id);
        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        $days = (int) $request->input('days', 7);
        $days = max(1, min(30, $days));

        $now    = now();
        $cutoff = $now->copy()->addDays($days);

        $slots = Meeting::query()
            ->where('model_profile_id', $profile->id)
            ->whereIn('status', array_map(
                static fn (MeetingStatus $s) => $s->value,
                MeetingStatus::openStatuses(),
            ))
            ->where('scheduled_at', '<', $cutoff)
            ->where('scheduled_at', '>=', $now->copy()->subDay())
            ->orderBy('scheduled_at')
            ->get(['scheduled_at', 'duration_hours'])
            ->map(static fn (Meeting $m) => [
                'scheduled_at'   => $m->scheduled_at?->toIso8601String(),
                'duration_hours' => (int) $m->duration_hours,
            ])
            ->values();

        return ApiResponse::ok($slots->all());
    }
}
