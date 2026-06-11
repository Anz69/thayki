<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhook;

use App\Models\Lead;
use App\Models\LeadCryptoAddress;
use App\Models\Message;
use App\Services\Telegram\Notifier;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class OxaPayWebhookController
{
    public function __invoke(Request $request): Response
    {
        $raw = $request->getContent();
        $hmac = (string) $request->header('HMAC', '');

        $service = app(\App\Services\Payments\OxaPayService::class);
        if (! $service->verifyWebhook($raw, $hmac)) {
            Log::warning('OxaPay webhook: invalid HMAC', ['len' => strlen($raw)]);

            return response('invalid signature', 400);
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return response('ok');
        }

        try {
            $this->process($payload);
        } catch (\Throwable $e) {
            Log::error('OxaPay webhook processing error', ['error' => $e->getMessage()]);
        }

        return response('ok');
    }

    private function process(array $payload): void
    {
        $status = strtolower((string) ($payload['status'] ?? ''));
        $address = $this->extractAddress($payload);
        if ($address === '') {
            return;
        }

        $row = LeadCryptoAddress::query()->where('address', $address)->first();
        if ($row === null) {
            Log::info('OxaPay webhook: unknown address', ['address' => $address, 'status' => $status]);

            return;
        }

        $lead = Lead::query()->with(['user', 'manager'])->find($row->lead_id);
        if ($lead === null) {
            return;
        }

        $coin = strtoupper((string) ($payload['currency'] ?? $row->network));
        $amount = (string) ($payload['amount'] ?? '0');
        $txHash = $this->extractTxHash($payload);

        $isPaid = in_array($status, ['paid', 'confirmed', 'completed'], true);

        $this->notifyManager($lead, $row, $coin, $amount, $address, $isPaid, $status);

        if ($isPaid && $row->status !== LeadCryptoAddress::STATUS_PAID) {
            try {
                $row->update([
                    'status' => LeadCryptoAddress::STATUS_PAID,
                    'paid_currency' => $coin,
                    'paid_amount' => is_numeric($amount) ? $amount : null,
                    'tx_hash' => $txHash,
                    'paid_at' => now(),
                ]);
            } catch (\Throwable $e) {
                Log::warning('OxaPay webhook: address update failed', ['error' => $e->getMessage()]);
            }
        }
    }

    private function fiatAmount(LeadCryptoAddress $row): string
    {
        $message = $row->message_id ? Message::query()->find($row->message_id) : null;
        $amountMinor = (int) ($message?->payload['amount_minor'] ?? 0);
        $currency = (string) ($message?->payload['currency'] ?? 'USD');
        $symbols = ['RUB' => '₽', 'USD' => '$', 'EUR' => '€'];
        $symbol = $symbols[$currency] ?? '';

        return $symbol.number_format($amountMinor / 100, 2).' '.$currency;
    }

    private function notifyManager(Lead $lead, LeadCryptoAddress $row, string $coin, string $amount, string $address, bool $paid, string $status): void
    {
        $client = $lead->user;
        $name = trim(($client->first_name ?? '').' '.($client->last_name ?? ''));
        if ($name === '') {
            $name = $client->username ?? '—';
        }
        $userLine = $name.($client?->username ? ' (@'.$client->username.')' : '');

        $leadIds = Lead::query()->where('user_id', $lead->user_id)->orderBy('id')->pluck('id');
        $reqLines = $leadIds->values()
            ->map(static fn ($id, $i) => ($i + 1).'. Заявка #'.$id)
            ->implode("\n");

        $shortAddr = strlen($address) > 16
            ? substr($address, 0, 8).'...'.substr($address, -6)
            : $address;

        $received = rtrim(rtrim((string) $amount, '0'), '.').' '.$coin;
        $usd = app(\App\Services\Payments\CryptoRateService::class)->usdValue((float) $amount, $coin);
        if ($usd !== null) {
            $received .= ' (≈ $'.number_format($usd, 2).')';
        }

        $expected = $this->fiatAmount($row);

        $head = $paid ? '✅ Поступил платеж в криптовалюте' : '⏳ Поступил платеж в криптовалюте';
        $statusLine = $paid ? 'Оплачен' : 'В процессе';

        $text = $head."\n\n"
            .'Статус: '.$statusLine."\n"
            .'Валюта: '.$coin."\n"
            .'Получено: '.$received."\n"
            .'Ожидалось: '.$expected."\n"
            .'Адрес: '.$shortAddr."\n\n"
            .'⚠️ Подтвердите оплату вручную в чате заявки, проверив сумму.'."\n\n"
            .'👤 Пользователь: '.$userLine."\n"
            .'📦 Заявки пользователя:'."\n"
            .$reqLines;

        $notifier = Notifier::default();
        $dedup = 'oxa-'.$status.'-'.md5($address.$amount);

        if ($lead->manager && $lead->manager->tg_chat_id) {
            $notifier->notifyUser($lead->manager, $text, '/manager/leads', 'Открыть', $dedup);
        } else {
            $notifier->notifyAdmins($text, '/manager/leads', 'Открыть', $dedup);
        }
    }

    private function extractAddress(array $payload): string
    {
        if (! empty($payload['txs']) && is_array($payload['txs'])) {
            foreach ($payload['txs'] as $tx) {
                if (! empty($tx['address'])) {
                    return (string) $tx['address'];
                }
            }
        }

        return (string) ($payload['address'] ?? '');
    }

    private function extractTxHash(array $payload): ?string
    {
        if (! empty($payload['txs']) && is_array($payload['txs'])) {
            foreach ($payload['txs'] as $tx) {
                if (! empty($tx['tx_hash'])) {
                    return (string) $tx['tx_hash'];
                }
            }
        }

        return $payload['tx_hash'] ?? null;
    }
}
