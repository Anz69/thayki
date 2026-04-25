<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Payment;
use App\Services\Payments\PaymentIntent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    private ?PaymentIntent $intent;

    public function __construct(Payment $resource, ?PaymentIntent $intent = null)
    {
        parent::__construct($resource);
        $this->intent = $intent;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'meeting_id' => $this->meeting_id,
            'user_id' => $this->user_id,
            'gateway' => $this->gateway,
            'method' => $this->method->value,
            'amount_minor' => $this->amount_minor,
            'currency' => $this->currency,
            'wallet_address' => $this->wallet_address,
            'tx_hash' => $this->tx_hash,
            'status' => $this->status->value,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'intent' => $this->intent?->toArray(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
