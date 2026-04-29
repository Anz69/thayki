<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Complaints\StoreComplaintRequest;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\Meeting;
use App\Models\User;
use App\Services\Telegram\Notifier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $meetingId = $request->query('meeting_id');

        $query = Complaint::query()->where('user_id', $user->id);
        if ($meetingId !== null) {
            $query->where('meeting_id', (int) $meetingId);
        }

        $complaints = $query->orderByDesc('created_at')->get();

        return ApiResponse::ok(ComplaintResource::collection($complaints));
    }

    public function store(StoreComplaintRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $meetingId = $request->input('meeting_id');
        if ($meetingId !== null) {
            /** @var Meeting|null $meeting */
            $meeting = Meeting::query()->find((int) $meetingId);
            if ($meeting === null) {
                throw DomainException::invalid('MEETING_NOT_FOUND', 'Meeting not found.');
            }

            $profile = $user->modelProfile()->first();
            $isClient = $meeting->client_id === $user->id;
            $isModel  = $profile !== null && $profile->id === $meeting->model_profile_id;
            if ($user->role !== UserRole::Admin && ! $isClient && ! $isModel) {
                throw DomainException::forbidden('COMPLAINT_FORBIDDEN', 'You are not a participant of this meeting.');
            }
        }

        if ($meetingId !== null) {
            $existing = Complaint::query()
                ->where('user_id', $user->id)
                ->where('meeting_id', (int) $meetingId)
                ->where('subject', (string) $request->input('subject'))
                ->first();
            if ($existing !== null) {
                return ApiResponse::ok(new ComplaintResource($existing));
            }
        }

        /** @var Complaint $complaint */
        $complaint = Complaint::query()->create([
            'user_id'    => $user->id,
            'meeting_id' => $meetingId,
            'subject'    => $request->input('subject'),
            'body'       => (string) $request->input('body'),
            'status'     => Complaint::STATUS_PENDING,
        ]);

        try {
            $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
            if ($name === '') $name = $user->username ?? 'пользователь';
            Notifier::default()->notifyAdmins(
                "⚠️ Новая жалоба #{$complaint->id} от {$name}".($meetingId ? " (бронь #{$meetingId})" : '').".",
            );
        } catch (\Throwable) {
        }

        return ApiResponse::created(new ComplaintResource($complaint));
    }
}
