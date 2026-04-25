<?php

declare(strict_types=1);

namespace App\Actions\Payment;

use App\Actions\Booking\TransitionMeetingStatusAction;
use App\Enums\MeetingStatus;
use App\Enums\PaymentStatus;
use App\Enums\WalletTransactionType;
use App\Exceptions\DomainException;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;

class ConfirmPaymentAction
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly TransitionMeetingStatusAction $transitionMeeting,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Payment $payment, User $actor): Payment
    {
        return DB::transaction(function () use ($payment, $actor): Payment {
            /** @var Payment $payment */
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status === PaymentStatus::Confirmed) {
                return $payment;
            }

            if (! in_array($payment->status, [PaymentStatus::Submitted, PaymentStatus::Pending], true)) {
                throw DomainException::conflict('PAYMENT_INVALID_STATE', 'Payment cannot be confirmed from state '.$payment->status->value);
            }

            $payment->update([
                'status' => PaymentStatus::Confirmed,
                'confirmed_at' => now(),
            ]);

            $meeting = $payment->meeting()->lockForUpdate()->firstOrFail();

            $creditableStatuses = [MeetingStatus::Accepted, MeetingStatus::Paid, MeetingStatus::Confirmed];
            if (! in_array($meeting->status, $creditableStatuses, true)) {
                throw DomainException::conflict(
                    'MEETING_INVALID_STATE',
                    "Cannot credit wallet: meeting is in state {$meeting->status->value}.",
                );
            }

            if ($meeting->status === MeetingStatus::Accepted) {
                $this->transitionMeeting->execute($meeting, MeetingStatus::Paid, $actor);
                $meeting->refresh();
            }

            $modelOwner = $meeting->modelProfile()->firstOrFail()->user()->firstOrFail();

            $commission = (float) config('payments.commission', 0.15);
            $grossMinor = (int) $payment->amount_minor;
            $netMinor = (int) round($grossMinor * (1 - $commission));

            $this->wallets->credit(
                user: $modelOwner,
                amountMinor: $netMinor,
                type: WalletTransactionType::CreditPayment,
                referenceType: Payment::class,
                referenceId: $payment->id,
                meta: [
                    'commission' => $commission,
                    'gross_minor' => $grossMinor,
                ],
            );

            $this->audit->log('payment.confirmed', $actor, $payment, [
                'meeting_id' => $meeting->id,
                'net_minor' => $netMinor,
                'commission' => $commission,
            ]);

            return $payment->refresh();
        });
    }
}
