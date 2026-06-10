<?php

declare(strict_types=1);

namespace App\Services\Payments\Contracts;

use App\Models\Payment;
use App\Services\Payments\PaymentIntent;
use App\Services\Payments\PaymentVerificationResult;

interface PaymentGateway
{

    public function createIntent(Payment $payment): PaymentIntent;

    public function verify(Payment $payment): PaymentVerificationResult;

    public function refund(Payment $payment): void;

    public function name(): string;
}
