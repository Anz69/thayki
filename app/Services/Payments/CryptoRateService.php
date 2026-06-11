<?php

declare(strict_types=1);

namespace App\Services\Payments;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CryptoRateService
{
    public function prices(): array
    {
        return Cache::remember('oxa:prices', 300, function (): array {
            try {
                $r = Http::timeout(15)->get('https://api.oxapay.com/v1/common/prices');
                $data = $r->json('data');

                return is_array($data) ? $data : [];
            } catch (\Throwable) {
                return [];
            }
        });
    }

    public function fiatPerUsd(): array
    {
        return Cache::remember('fiat:per_usd', 3600, function (): array {
            try {
                $r = Http::timeout(15)->get('https://open.er-api.com/v6/latest/USD');
                $rates = $r->json('rates');

                return is_array($rates) ? $rates : ['USD' => 1.0];
            } catch (\Throwable) {
                return ['USD' => 1.0];
            }
        });
    }

    public function toUsd(float $amount, string $currency): ?float
    {
        $currency = strtoupper($currency);
        if ($currency === 'USD') {
            return $amount;
        }
        $f = $this->fiatPerUsd();
        if (! isset($f[$currency]) || (float) $f[$currency] <= 0) {
            return null;
        }

        return $amount / (float) $f[$currency];
    }

    public function cryptoAmount(float $amountFiat, string $currency, string $coin): ?string
    {
        $usd = $this->toUsd($amountFiat, $currency);
        if ($usd === null) {
            return null;
        }
        $price = $this->prices()[strtoupper($coin)] ?? null;
        if (! $price || (float) $price <= 0) {
            return null;
        }

        return $this->format($usd / (float) $price);
    }

    private function format(float $n): string
    {
        if ($n >= 1000) {
            return number_format($n, 2, '.', '');
        }
        $decimals = $n >= 1 ? 4 : ($n >= 0.01 ? 6 : 8);
        $s = number_format($n, $decimals, '.', '');

        return str_contains($s, '.') ? rtrim(rtrim($s, '0'), '.') : $s;
    }
}
