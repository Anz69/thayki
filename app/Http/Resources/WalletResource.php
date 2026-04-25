<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\PaymentMethod;
use App\Models\AppSetting;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Wallet
 */
class WalletResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $defaultMethods = implode(',', array_map(
            static fn (PaymentMethod $method): string => $method->value,
            PaymentMethod::withdrawalDefaults()
        ));
        $rawMethods = (string) AppSetting::get('withdrawal_methods', $defaultMethods);
        $parts = array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', $rawMethods)
        ));

        $withdrawalMethods = [];
        foreach ($parts as $part) {
            $enum = PaymentMethod::tryFrom($part);
            if ($enum !== null && $enum !== PaymentMethod::Manual) {
                $withdrawalMethods[] = [
                    'value' => $enum->value,
                    'label' => $enum->label(),
                ];
            }
        }
        if ($withdrawalMethods === []) {
            $withdrawalMethods = array_map(
                static fn (PaymentMethod $method): array => [
                    'value' => $method->value,
                    'label' => $method->label(),
                ],
                PaymentMethod::withdrawalDefaults()
            );
        }

        return [
            'id' => $this->id,
            'balance_minor' => $this->balance_minor,
            'locked_minor' => $this->locked_minor,
            'available_minor' => $this->availableBalance(),
            'currency' => $this->currency,
            'version' => $this->version,
            'withdrawal_methods' => $withdrawalMethods,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
