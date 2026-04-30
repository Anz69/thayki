<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Booking\CreateMeetingAction;
use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Enums\UserRole;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CreateMeetingRequest;
use App\Http\Resources\MeetingResource;
use App\Jobs\ExpirePendingMeetingJob;
use App\Models\AppSetting;
use App\Models\Meeting;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class MeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Meeting::query()->with(['modelProfile.photos', 'modelProfile.user', 'client']);

        if ($user->role === UserRole::Model) {
            $profile   = $user->modelProfile()->first();
            $profileId = $profile?->id ?? 0;
            $role      = $request->input('role');
            if ($role === 'model') {
                $query->where('model_profile_id', $profileId);
            } elseif ($role === 'client') {
                $query->where('client_id', $user->id);
            } else {
                $query->where(function ($q) use ($user, $profileId) {
                    $q->where('model_profile_id', $profileId)
                      ->orWhere('client_id', $user->id);
                });
            }
        } elseif ($user->role === UserRole::Admin) {
        } else {
            $query->where('client_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', MeetingStatus::from((string) $request->input('status')));
        }

        if ($request->filled('statuses')) {
            $rawStatuses = array_filter(array_map(
                static fn (string $value): string => trim($value),
                explode(',', (string) $request->input('statuses'))
            ));

            $statuses = [];
            foreach ($rawStatuses as $rawStatus) {
                $enum = MeetingStatus::tryFrom($rawStatus);
                if ($enum !== null) {
                    $statuses[] = $enum->value;
                }
            }

            if ($statuses !== []) {
                $query->whereIn('status', $statuses);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $paginator = $query->orderByDesc('id')->paginate(
            perPage: min(100, (int) $request->input('per_page', 20)),
            page: (int) $request->input('page', 1),
        );

        $normalized = $paginator->getCollection()->map(function (Meeting $meeting) use ($user) {
            return $this->expireStalePendingIfNeeded($meeting, $user);
        });
        $paginator->setCollection($normalized);

        return ApiResponse::ok(
            MeetingResource::collection($paginator->getCollection())->resolve(),
            [
                'pagination' => [
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        );
    }

    public function latest(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $meeting = Meeting::query()
            ->with(['modelProfile.photos', 'modelProfile.user', 'client'])
            ->where(function ($q) use ($user) {
                $profile = $user->modelProfile()->first();
                $q->where('client_id', $user->id);
                if ($profile !== null) {
                    $q->orWhere('model_profile_id', $profile->id);
                }
            })
            ->whereIn('status', array_map(fn (MeetingStatus $s) => $s->value, MeetingStatus::openStatuses()))
            ->latest('id')
            ->first();

        if ($meeting === null) {
            return ApiResponse::error('NOT_FOUND', 'No active meeting found.', null, 404);
        }

        $meeting = $this->expireStalePendingIfNeeded($meeting, $user);

        return ApiResponse::ok(new MeetingResource($meeting));
    }

    public function show(Request $request, Meeting $meeting): JsonResponse
    {
        $this->authorizeAccess($request->user(), $meeting);
        /** @var User $user */
        $user = $request->user();
        $meeting = $this->expireStalePendingIfNeeded($meeting, $user);

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    public function store(CreateMeetingRequest $request, CreateMeetingAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $meeting = $action->execute(
            client: $user,
            modelProfileId: (int) $request->input('model_profile_id'),
            scheduledAt: CarbonImmutable::parse((string) $request->input('scheduled_at')),
            durationHours: (int) $request->input('duration_hours'),
        );

        if (config('queue.default') !== 'sync') {
            $ttl = (int) config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600));
            ExpirePendingMeetingJob::dispatch($meeting->id)->delay(now()->addSeconds($ttl));
        }

        return ApiResponse::created(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    public function accept(Request $request, Meeting $meeting, TransitionMeetingStatusAction $transition): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeModelOwner($user, $meeting);

        $meeting = $transition->execute($meeting, MeetingStatus::Accepted, $user);

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    public function reject(Request $request, Meeting $meeting, TransitionMeetingStatusAction $transition): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeModelOwner($user, $meeting);

        $request->validate(['reason' => ['sometimes', 'string', 'max:255']]);
        $meeting = $transition->execute($meeting, MeetingStatus::Rejected, $user, $request->input('reason'));

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    public function cancel(Request $request, Meeting $meeting, TransitionMeetingStatusAction $transition): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeAccess($user, $meeting);
        $request->validate(['reason' => ['sometimes', 'string', 'max:255']]);

        $meeting = $transition->execute($meeting, MeetingStatus::Cancelled, $user, $request->input('reason'));

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    /**
     * Legacy endpoint. The product flow no longer asks the model to "confirm"
     * after payment — paid is treated as the final positive state. We keep
     * the route defined for backwards compatibility, but it now returns the
     * meeting as-is (idempotent no-op) rather than transitioning to a status
     * that the simplified state machine no longer accepts.
     */
    public function confirm(Request $request, Meeting $meeting, TransitionMeetingStatusAction $transition): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeModelOwner($user, $meeting);

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    public function complete(Request $request, Meeting $meeting, TransitionMeetingStatusAction $transition): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeAccess($user, $meeting);

        $meeting = $transition->execute($meeting, MeetingStatus::Completed, $user);

        return ApiResponse::ok(new MeetingResource($meeting->load(['modelProfile.photos', 'modelProfile.user', 'client'])));
    }

    private function authorizeAccess(?User $user, Meeting $meeting): void
    {
        if ($user === null) {
            throw new AccessDeniedHttpException;
        }
        if ($user->role === UserRole::Admin) {
            return;
        }
        if ($meeting->client_id === $user->id) {
            return;
        }
        $profile = $user->modelProfile()->first();
        if ($profile !== null && $profile->id === $meeting->model_profile_id) {
            return;
        }

        throw DomainException::forbidden('MEETING_FORBIDDEN', 'You do not have access to this meeting.');
    }

    private function authorizeModelOwner(User $user, Meeting $meeting): void
    {
        if ($user->role === UserRole::Admin) {
            return;
        }
        $profile = $user->modelProfile()->first();
        if ($profile === null || $profile->id !== $meeting->model_profile_id) {
            throw DomainException::forbidden('MEETING_FORBIDDEN', 'Only the model can perform this action.');
        }
    }

    private function expireStalePendingIfNeeded(Meeting $meeting, User $actor): Meeting
    {
        if ($meeting->status !== MeetingStatus::Pending || $meeting->created_at === null) {
            return $meeting;
        }

        $ttl = (int) (AppSetting::get('meeting_pending_ttl') ?? config('app.meeting_pending_ttl', env('MEETING_PENDING_TTL', 600)));
        $ttl = $ttl > 0 ? $ttl : 600;
        $expireAt = $meeting->created_at->copy()->addSeconds($ttl);
        if ($expireAt->isFuture()) {
            return $meeting;
        }

        try {
            $transition = app(TransitionMeetingStatusAction::class);
            return $transition->execute($meeting, MeetingStatus::Expired, $actor, 'auto-expired-fallback');
        } catch (\Throwable) {
            return $meeting->fresh() ?? $meeting;
        }
    }
}
