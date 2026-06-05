<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Lead\CreateLeadAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Models\Lead;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    /** Current user's submitted requests, newest first. */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $leads = Lead::query()
            ->where('user_id', $user->id)
            ->with(['modelProfile.photos'])
            ->latest()
            ->get()
            ->map(function (Lead $lead): array {
                $profile = $lead->modelProfile;
                $main = $profile
                    ? ($profile->photos->firstWhere('is_main', true) ?? $profile->photos->first())
                    : null;

                return [
                    'id' => $lead->id,
                    'chat_id' => $lead->chat_id,
                    'city' => $lead->city,
                    'status' => $lead->status->value,
                    'wishes' => $lead->wishes,
                    'created_at' => $lead->created_at?->toIso8601String(),
                    'model' => $profile ? [
                        'display_name' => $profile->display_name,
                        'display_name_en' => $profile->display_name_en,
                        'photo' => $main?->getUrl(),
                    ] : null,
                ];
            });

        return ApiResponse::ok($leads);
    }

    public function store(StoreLeadRequest $request, CreateLeadAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $lead = $action->execute($user, $request->validated());

        return ApiResponse::created([
            'lead_id' => $lead->id,
            'chat_id' => $lead->chat_id,
        ]);
    }
}
