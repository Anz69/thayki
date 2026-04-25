<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Payment;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

/**
 * Explicit stub implementation: issues a wallet address from configuration
 * and defers verification to an admin action (POST /admin/payments/{id}/confirm).
 *
 * This class keeps the contract clean so USDT/BTC/TON/fiat adapters can be
 * plugged in later without touching any action or controller.
 */
class ManualPaymentGateway implements PaymentGateway
{
    public function __construct(private readonly ConfigRepository $config) {}

    public function createIntent(Payment $payment): PaymentIntent
    {
        $method = $payment->method->value;
        $address = (string) $this->config->get("payments.methods.{$method}.address", '');

        return new PaymentIntent(
            walletAddress: $address,
            amountMinor: $payment->amount_minor,
            currency: $payment->currency,
            method: $method,
            extra: [
                'gateway' => $this->name(),
                'instructions' => 'Transfer the exact amount to the provided wallet address and submit the transaction hash.',
            ],
        );
    }

    public function verify(Payment $payment): PaymentVerificationResult
    {
        return PaymentVerificationResult::pending();
    }

    public function refund(Payment $payment): void
    {
        // No-op: manual refunds are handled out-of-band by admins.
    }

    public function name(): string
    {
        return 'manual';
    }
}
