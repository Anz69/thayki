<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\ModelApplication\ApproveModelApplicationAction;
use App\Actions\ModelApplication\RejectModelApplicationAction;
use App\Enums\ModelApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ModelApplicationResource;
use App\Models\ModelApplication;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModelApplicationAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ModelApplication::query()->with('user');

        if ($request->filled('status')) {
            $query->where('status', ModelApplicationStatus::from((string) $request->input('status')));
        }

        $paginator = $query->orderByDesc('id')->paginate(
            perPage: min(100, (int) $request->input('per_page', 20)),
            page: (int) $request->input('page', 1),
        );

        return ApiResponse::ok(
            ModelApplicationResource::collection($paginator->getCollection())->resolve(),
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

    public function approve(Request $request, ModelApplication $application, ApproveModelApplicationAction $action): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $application = $action->execute($application, $admin);

        return ApiResponse::ok(new ModelApplicationResource($application));
    }

    public function reject(Request $request, ModelApplication $application, RejectModelApplicationAction $action): JsonResponse
    {
        $request->validate([
            'note' => ['sometimes', 'string', 'max:1024'],
        ]);

        /** @var User $admin */
        $admin = $request->user();
        $application = $action->execute($application, $admin, $request->input('note'));

        return ApiResponse::ok(new ModelApplicationResource($application));
    }
}
