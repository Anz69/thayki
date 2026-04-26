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
        /** @var array<string, mixed> $filters */
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
        /** @var ModelProfile|null $profile */
        $profile = ModelProfile::query()
            ->published()
            ->with(['photos', 'priceOptions'])
            ->find($id);

        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        return ApiResponse::ok(new ModelProfileResource($profile));
    }

    /**
     * Returns the model's currently-occupied slots for the booking modal so
     * the front-end can grey out conflicting times before the user submits.
     *
     * Open meetings only — terminal statuses (rejected, expired, cancelled,
     * completed) are excluded so they don't keep blocking new bookings.
     *
     * Window: today → today+`days` (default 7, max 30). Slots are returned
     * as ISO timestamps + duration_hours, so the FE can compute end-of-slot
     * and detect overlaps with any (start, duration) the user picks.
     */
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
            // include slots that started before "now" but are still ongoing
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
