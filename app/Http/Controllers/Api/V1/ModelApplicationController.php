<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\ModelApplication\SubmitModelApplicationAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ModelApplication\SubmitModelApplicationRequest;
use App\Http\Resources\ModelApplicationResource;
use App\Models\ModelApplication;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ModelApplicationController extends Controller
{
    public function show(Request $request): JsonResponse
    {

        $user = $request->user();

        $application = ModelApplication::query()->where('user_id', $user->id)->first();
        if ($application === null) {
            return ApiResponse::ok(null);
        }

        return ApiResponse::ok(new ModelApplicationResource($application));
    }

    public function store(SubmitModelApplicationRequest $request, SubmitModelApplicationAction $action): JsonResponse
    {

        $user = $request->user();
        $application = $action->execute($user, $request->validated());

        return ApiResponse::created(new ModelApplicationResource($application));
    }
}
