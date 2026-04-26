<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Wallet\RequestWithdrawalAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wallet\RequestWithdrawalRequest;
use App\Http\Resources\WalletResource;
use App\Http\Resources\WithdrawalResource;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Wallet $wallet */
        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
        );

        return ApiResponse::ok(new WalletResource($wallet));
    }

    public function transactions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Wallet $wallet */
        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance_minor' => 0, 'locked_minor' => 0, 'currency' => 'THB', 'version' => 0],
        );

        $paginator = $wallet->transactions()
            ->orderByDesc('id')
            ->paginate(
                perPage: min(100, (int) $request->input('per_page', 20)),
                page: (int) $request->input('page', 1),
            );

        return ApiResponse::ok($paginator);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $paginator = Withdrawal::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->paginate(
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

    public function requestWithdrawal(RequestWithdrawalRequest $request, RequestWithdrawalAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $withdrawal = $action->execute(
            $user,
            (int) $request->input('amount_minor'),
        );

        return ApiResponse::created(new WithdrawalResource($withdrawal));
    }
}
