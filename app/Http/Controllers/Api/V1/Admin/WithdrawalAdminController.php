<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Wallet\ProcessWithdrawalAction;
use App\Enums\WithdrawalStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\WithdrawalResource;
use App\Models\User;
use App\Models\Withdrawal;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawalAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Withdrawal::query()->with('user');

        if ($request->filled('status')) {
            $query->where('status', WithdrawalStatus::from((string) $request->input('status')));
        }

        $paginator = $query->orderByDesc('id')->paginate(
            perPage: min(100, (int) $request->input('per_page', 20)),
            page: (int) $request->input('page', 1),
        );

        return ApiResponse::ok(
            WithdrawalResource::collection($paginator->getCollection())->resolve(),
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

    public function approve(Request $request, Withdrawal $withdrawal, ProcessWithdrawalAction $action): JsonResponse
    {

        $admin = $request->user();

        return ApiResponse::ok(new WithdrawalResource($action->approve($withdrawal, $admin)));
    }

    public function markPaid(Request $request, Withdrawal $withdrawal, ProcessWithdrawalAction $action): JsonResponse
    {

        $admin = $request->user();

        return ApiResponse::ok(new WithdrawalResource($action->markPaid($withdrawal, $admin)));
    }

    public function reject(Request $request, Withdrawal $withdrawal, ProcessWithdrawalAction $action): JsonResponse
    {
        $request->validate(['note' => ['sometimes', 'string', 'max:1024']]);

        $admin = $request->user();

        return ApiResponse::ok(new WithdrawalResource($action->reject($withdrawal, $admin, $request->input('note'))));
    }
}
