<?php

declare(strict_types=1);

namespace App\Actions\Payment;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Meeting;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;

class EnsureSyntheticPaymentForMeetingAction
{
    public function execute(Meeting $meeting): ?Payment
    {
        $existing = Payment::query()->where('meeting_id', $meeting->id)->first();
        if ($existing !== null) {
            return $existing;
        }

        if ((int) $meeting->client_id <= 0) {
            Log::warning('[EnsureSyntheticPaymentForMeetingAction] missing client_id', [
                'meeting_id' => $meeting->id,
            ]);

            return null;
        }

        if ((int) $meeting->price_thb <= 0) {
            Log::warning('[EnsureSyntheticPaymentForMeetingAction] price_thb must be positive', [
                'meeting_id' => $meeting->id,
            ]);

            return null;
        }

        return Payment::query()->create([
            'meeting_id' => $meeting->id,
            'user_id' => $meeting->client_id,
            'gateway' => 'admin',
            'method' => PaymentMethod::Manual,
            'amount_minor' => (int) $meeting->price_thb * 100,
            'currency' => (string) config('payments.currency', 'THB'),
            'tx_hash' => 'admin:meeting:'.$meeting->id,
            'status' => PaymentStatus::Pending,
        ]);
    }
}
