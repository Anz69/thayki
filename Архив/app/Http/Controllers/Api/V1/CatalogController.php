<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListModelsRequest;
use App\Http\Resources\ModelProfileResource;
use App\Models\ModelProfile;
use App\Services\Catalog\ModelProfileQuery;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
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
}
