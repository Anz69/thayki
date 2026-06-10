<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Payment\ConfirmPaymentAction;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::query()->with(['user', 'meeting']);

        if ($request->filled('status')) {
            $query->where('status', PaymentStatus::from((string) $request->input('status')));
        }

        $paginator = $query->orderByDesc('id')->paginate(
            perPage: min(100, (int) $request->input('per_page', 20)),
            page: (int) $request->input('page', 1),
        );

        return ApiResponse::ok(
            PaymentResource::collection($paginator->getCollection())->resolve(),
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

    public function confirm(Request $request, Payment $payment, ConfirmPaymentAction $action): JsonResponse
    {

        $admin = $request->user();
        $payment = $action->execute($payment, $admin);

        return ApiResponse::ok(new PaymentResource($payment));
    }
}
