<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Lead\CreateLeadAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class LeadController extends Controller
{
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
