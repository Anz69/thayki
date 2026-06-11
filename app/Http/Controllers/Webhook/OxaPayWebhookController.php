<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhook;

use App\Events\MessageSent;
use App\Jobs\RevokeLeadCryptoAddressesJob;
use App\Models\Lead;
use App\Models\LeadCryptoAddress;
use App\Models\LeadPayment;
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
        $isPaying = in_array($status, ['paying', 'confirming', 'waiting'], true);

        if ($isPaid) {
            if ($row->status !== LeadCryptoAddress::STATUS_PAID) {
                $row->update([
                    'status' => LeadCryptoAddress::STATUS_PAID,
                    'paid_currency' => $coin,
                    'paid_amount' => is_numeric($amount) ? $amount : null,
                    'tx_hash' => $txHash,
                    'paid_at' => now(),
                ]);
                $this->confirmPayment($lead, $row);
                RevokeLeadCryptoAddressesJob::dispatch($lead->id, $row->id)->afterResponse();
            }
            $this->notifyManager($lead, $coin, $amount, $address, true);

            return;
        }

        if ($isPaying) {
            $this->notifyManager($lead, $coin, $amount, $address, false);
        }
    }

    private function confirmPayment(Lead $lead, LeadCryptoAddress $row): void
    {
        $message = $row->message_id ? Message::query()->find($row->message_id) : null;
        if ($message === null) {
            return;
        }

        $payload = $message->payload ?? [];
        if (($payload['status'] ?? null) === 'confirmed') {
            return;
        }

        $amountMinor = (int) ($payload['amount_minor'] ?? 0);
        $currency = (string) ($payload['currency'] ?? 'USD');

        LeadPayment::query()->create([
            'lead_id' => $lead->id,
            'manager_id' => $lead->manager_id,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'method' => 'crypto',
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        $message->update(['payload' => array_merge($payload, ['status' => 'confirmed'])]);
        event(new MessageSent($message->fresh()));

        if (in_array($lead->status->value ?? (string) $lead->status, ['new', 'in_progress', 'awaiting_payment'], true)) {
            $lead->update(['status' => \App\Enums\LeadStatus::Prepaid]);
        }
    }

    private function notifyManager(Lead $lead, string $coin, string $amount, string $address, bool $paid): void
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

        $head = $paid ? '✅ Поступил платеж в криптовалюте' : '⏳ Поступил платеж в криптовалюте';
        $statusLine = $paid ? 'Оплачен' : 'В процессе';

        $text = $head."\n\n"
            .'Статус: '.$statusLine."\n"
            .'Валюта: '.$coin."\n"
            .'Сумма: '.$amount.' '.$coin."\n"
            .'Адрес: '.$shortAddr."\n\n"
            .'👤 Пользователь: '.$userLine."\n"
            .'📦 Заявки пользователя:'."\n"
            .$reqLines;

        $notifier = Notifier::default();
        $dedup = 'oxa-'.($paid ? 'paid' : 'pay').'-'.md5($address.$amount);

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
