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

class ComplaintController extends Controller
{
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

            // Authorize: must be either client of the meeting, or the model.
            $profile = $user->modelProfile()->first();
            $isClient = $meeting->client_id === $user->id;
            $isModel  = $profile !== null && $profile->id === $meeting->model_profile_id;
            if ($user->role !== UserRole::Admin && ! $isClient && ! $isModel) {
                throw DomainException::forbidden('COMPLAINT_FORBIDDEN', 'You are not a participant of this meeting.');
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
            // notification is best-effort
        }

        return ApiResponse::created(new ComplaintResource($complaint));
    }
}
