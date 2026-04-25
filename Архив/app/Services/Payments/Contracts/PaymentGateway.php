<?php

declare(strict_types=1);

namespace App\Services\Payments\Contracts;

use App\Models\Payment;
use App\Services\Payments\PaymentIntent;
use App\Services\Payments\PaymentVerificationResult;

/**
 * Contract every concrete payment provider must satisfy.
 *
 * The core business logic (SubmitPaymentAction, ConfirmPaymentAction) never
 * reaches into provider specifics — it only depends on this interface.
 * Adding USDT / BTC / TON / fiat providers is a matter of plugging in
 * another class and registering it in config/payments.php#gateways.
 */
interface PaymentGateway
{
    /**
     * Returns the wallet address / payment target the client must send funds
     * to, plus any client-visible metadata (QR, memo, etc).
     */
    public function createIntent(Payment $payment): PaymentIntent;

    /**
     * Server-side verification attempt. For the manual stub this always
     * returns `pending` — confirmation happens via admin action.
     */
    public function verify(Payment $payment): PaymentVerificationResult;

    /**
     * Triggers a refund with the external provider. No-op for the manual
     * stub — refunds for off-chain transfers are handled out-of-band.
     */
    public function refund(Payment $payment): void;

    /**
     * The alias matching the key in config/payments.php#gateways.
     */
    public function name(): string;
}
