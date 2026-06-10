<?php

declare(strict_types=1);

namespace App\Actions\Payment;

use App\Enums\MeetingStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\DomainException;
use App\Models\Meeting;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentIntent;
use Illuminate\Support\Facades\DB;

class CreatePaymentAction
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(User $client, int $meetingId, PaymentMethod $method): array
    {
        return DB::transaction(function () use ($client, $meetingId, $method): array {

            $meeting = Meeting::query()->whereKey($meetingId)->lockForUpdate()->firstOrFail();

            if ($meeting->client_id !== $client->id) {
                throw DomainException::forbidden('PAYMENT_FORBIDDEN', 'Only the booking client can pay for this meeting.');
            }

            if ($meeting->status !== MeetingStatus::Accepted) {
                throw DomainException::conflict('PAYMENT_INVALID_STATE', 'Payment can only be created for accepted meetings.');
            }

            $existing = Payment::query()->where('meeting_id', $meeting->id)->lockForUpdate()->first();

            if ($existing !== null) {
                if ($existing->status === PaymentStatus::Confirmed) {
                    throw DomainException::conflict('PAYMENT_ALREADY_CONFIRMED', 'Payment has already been confirmed.');
                }
                if ($existing->status === PaymentStatus::Submitted) {
                    throw DomainException::conflict('PAYMENT_ALREADY_SUBMITTED', 'Payment transaction has already been submitted for review.');
                }
            }

            $gateway = $this->gateways->default();

            if ($existing !== null) {
                $existing->update([
                    'method' => $method,
                    'amount_minor' => $meeting->price_thb * 100,
                    'status' => PaymentStatus::Pending,
                ]);
                $payment = $existing->refresh();
            } else {

                $payment = Payment::query()->create([
                    'meeting_id' => $meeting->id,
                    'user_id' => $client->id,
                    'gateway' => $gateway->name(),
                    'method' => $method,
                    'amount_minor' => $meeting->price_thb * 100,
                    'currency' => (string) config('payments.currency', 'THB'),
                    'status' => PaymentStatus::Pending,
                ]);
            }

            $intent = $gateway->createIntent($payment);

            $payment->update(['wallet_address' => $intent->walletAddress]);

            $this->audit->log('payment.created', $client, $payment, [
                'meeting_id' => $meeting->id,
                'method' => $method->value,
            ]);

            return ['payment' => $payment->refresh(), 'intent' => $intent];
        });
    }
}
