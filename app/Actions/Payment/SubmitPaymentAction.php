<?php

declare(strict_types=1);

namespace App\Actions\Payment;

use App\Enums\PaymentStatus;
use App\Exceptions\DomainException;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class SubmitPaymentAction
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function execute(User $client, Payment $payment, string $txHash): Payment
    {
        return DB::transaction(function () use ($client, $payment, $txHash): Payment {
            /** @var Payment $payment */
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->user_id !== $client->id) {
                throw DomainException::forbidden('PAYMENT_FORBIDDEN', 'You do not own this payment.');
            }

            if (! in_array($payment->status, [PaymentStatus::Pending, PaymentStatus::Submitted, PaymentStatus::Failed], true)) {
                throw DomainException::conflict('PAYMENT_INVALID_STATE', 'Payment cannot be resubmitted.');
            }

            $payment->update([
                'tx_hash' => $txHash,
                'status' => PaymentStatus::Submitted,
            ]);

            $this->audit->log('payment.submitted', $client, $payment, [
                'tx_hash' => $txHash,
            ]);

            return $payment->refresh();
        });
    }
}
