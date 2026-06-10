<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Payment\CreatePaymentAction;
use App\Actions\Payment\SubmitPaymentAction;
use App\Enums\PaymentMethod;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\CreatePaymentRequest;
use App\Http\Requests\Payment\SubmitPaymentTxRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function store(CreatePaymentRequest $request, CreatePaymentAction $action): JsonResponse
    {

        $user = $request->user();

        $result = $action->execute(
            $user,
            (int) $request->input('meeting_id'),
            PaymentMethod::from((string) $request->input('method')),
        );

        return ApiResponse::created(new PaymentResource($result['payment'], $result['intent']));
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {

        $user = $request->user();
        if ($payment->user_id !== $user->id) {
            throw DomainException::forbidden('PAYMENT_FORBIDDEN', 'You do not own this payment.');
        }

        return ApiResponse::ok(new PaymentResource($payment));
    }

    public function submit(SubmitPaymentTxRequest $request, Payment $payment, SubmitPaymentAction $action): JsonResponse
    {

        $user = $request->user();
        $payment = $action->execute($user, $payment, (string) $request->input('tx_hash'));

        return ApiResponse::ok(new PaymentResource($payment));
    }
}
