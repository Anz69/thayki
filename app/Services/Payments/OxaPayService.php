<?php

declare(strict_types=1);

namespace App\Services\Payments;

use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OxaPayService
{
    public function __construct(private readonly ConfigRepository $config) {}

    private function key(): string
    {
        return trim((string) $this->config->get('oxapay.api_key', ''));
    }

    private function base(): string
    {
        return (string) $this->config->get('oxapay.base_url', 'https://api.oxapay.com/v1');
    }

    private function throttle(): void
    {
        $ms = (int) $this->config->get('oxapay.rate_limit_ms', 1300);
        if ($ms <= 0) {
            return;
        }
        $now = microtime(true) * 1000;
        $last = (float) Cache::get('oxapay:last_call', 0);
        $wait = $ms - ($now - $last);
        if ($wait > 0 && $wait < 10000) {
            usleep((int) ($wait * 1000));
        }
        Cache::put('oxapay:last_call', microtime(true) * 1000, 60);
    }

    public function generateStaticAddress(string $network, string $orderId, ?string $description = null): array
    {
        if ($this->key() === '') {
            throw new RuntimeException('OXAPAY_MERCHANT_KEY is not configured.');
        }

        $this->throttle();

        $response = Http::withHeaders([
            'merchant_api_key' => $this->key(),
            'Content-Type' => 'application/json',
        ])->timeout(30)->post($this->base().'/payment/static-address', array_filter([
            'network' => $network,
            'callback_url' => $this->config->get('oxapay.callback_url'),
            'order_id' => $orderId,
            'description' => $description,
        ], static fn ($v) => $v !== null && $v !== ''));

        $json = $response->json();

        if (! $response->successful() || ! empty($json['error'])) {
            Log::error('OxaPay static-address generation failed', [
                'network' => $network,
                'order_id' => $orderId,
                'status' => $response->status(),
                'error' => $json['error'] ?? null,
            ]);
            throw new RuntimeException('OxaPay generate failed for '.$network);
        }

        $data = $json['data'] ?? [];

        return [
            'address' => (string) ($data['address'] ?? ''),
            'memo' => isset($data['memo']) && $data['memo'] !== '' ? (string) $data['memo'] : null,
            'track_id' => (string) ($data['track_id'] ?? ''),
            'network' => (string) ($data['network'] ?? $network),
            'qr_code' => $data['qr_code'] ?? null,
        ];
    }

    public function listStaticAddresses(int $page = 1, int $size = 200): array
    {
        if ($this->key() === '') {
            return ['list' => [], 'meta' => []];
        }

        $this->throttle();

        $response = Http::withHeaders([
            'merchant_api_key' => $this->key(),
        ])->timeout(30)->get($this->base().'/payment/static-address', [
            'page' => $page,
            'size' => $size,
        ]);

        $data = $response->json('data');

        return is_array($data) ? $data : ['list' => [], 'meta' => []];
    }

    public function revokeStaticAddress(string $address): bool
    {
        if ($this->key() === '' || $address === '') {
            return false;
        }

        $this->throttle();

        $response = Http::withHeaders([
            'merchant_api_key' => $this->key(),
            'Content-Type' => 'application/json',
        ])->timeout(30)->post($this->base().'/payment/static-address/revoke', [
            'address' => $address,
        ]);

        $ok = $response->successful() && empty($response->json('error'));
        if (! $ok) {
            Log::warning('OxaPay revoke failed', [
                'address' => $address,
                'status' => $response->status(),
                'error' => $response->json('error'),
            ]);
        }

        return $ok;
    }

    public function verifyWebhook(string $rawBody, string $hmacHeader): bool
    {
        $key = $this->key();
        if ($key === '' || $hmacHeader === '') {
            return false;
        }
        $calculated = hash_hmac('sha512', $rawBody, $key);

        return hash_equals($calculated, $hmacHeader);
    }
}
