<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Chat\PostMessageAction;
use App\Actions\Lead\CreateLeadAction;
use App\Enums\ChatParticipantRole;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Models\Lead;
use App\Events\MessageSent;
use App\Models\LeadCryptoAddress;
use App\Models\Message;
use App\Models\User;
use App\Services\Telegram\Notifier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{

    public function index(Request $request): JsonResponse
    {

        $user = $request->user();

        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        $paginator = Lead::query()
            ->where('user_id', $user->id)
            ->with(['modelProfile.photos'])

            ->orderByRaw("CASE WHEN status IN ('closed','completed') THEN 1 ELSE 0 END asc")
            ->latest()
            ->paginate($perPage);

        $leads = $paginator->getCollection()->map(function (Lead $lead): array {
            $profile = $lead->modelProfile;
            $main = $profile
                ? ($profile->photos->firstWhere('is_main', true) ?? $profile->photos->first())
                : null;

            return [
                'id' => $lead->id,
                'chat_id' => $lead->chat_id,
                'city' => $lead->city,
                'status' => $lead->status->value,
                'wishes' => $lead->wishes,
                'created_at' => $lead->created_at?->toIso8601String(),
                'model' => $profile ? [
                    'display_name' => $profile->display_name,
                    'display_name_en' => $profile->display_name_en,
                    'photo' => $main?->getUrl(),
                ] : null,
            ];
        });

        return ApiResponse::ok($leads, [
            'pagination' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StoreLeadRequest $request, CreateLeadAction $action): JsonResponse
    {

        $user = $request->user();

        $lead = $action->execute($user, $request->validated());

        return ApiResponse::created([
            'lead_id' => $lead->id,
            'chat_id' => $lead->chat_id,
        ]);
    }

    public function verifyContact(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {

        $user = $request->user();

        if ($lead->user_id !== $user->id) {
            throw DomainException::forbidden('LEAD_FORBIDDEN', 'Not your request.');
        }

        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:32'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user->forceFill([
            'phone_number' => preg_replace('/[^0-9+]/', '', $data['phone_number']),
            'phone_verified_at' => now(),
        ])->save();

        if ($lead->identity_verified_at === null) {
            $lead->update(['identity_verified_at' => now()]);
        }

        // Client-facing system message → the client's current language.
        $locale = \App\Support\Locale::fromUser($user);
        $chat = $lead->chat;
        if ($chat !== null) {
            if (! $chat->participants()->where('user_id', $user->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $user->id,
                    'role' => ChatParticipantRole::Client,
                ]);
            }

            $card = Message::query()->where('chat_id', $chat->id)
                ->where('type', 'verification_request')
                ->latest('id')->first();
            if ($card !== null) {
                $card->update(['payload' => ['status' => 'done']]);
                try { event(new MessageSent($card->fresh())); } catch (\Throwable) {}
            }

            $post->execute($user, $chat->fresh(['participants']),
                trans('lead.verification_done', [], $locale), null, null, 'system');
        }

        if ($lead->manager_id !== null) {
            $manager = User::query()->find($lead->manager_id);
            $mLocale = \App\Support\Locale::fromUser($manager);
            Notifier::default()->notifyUser(
                $manager,
                trans('lead.verification_done_manager', ['name' => trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: ($user->username ?? '—')], $mLocale),
                "/request/chat?id={$lead->chat_id}&lead={$lead->id}&from=".rawurlencode('/manager/leads'),
                trans('notifications.open', [], $mLocale),
                'lead-verified:'.$lead->id,
            );
        }

        return ApiResponse::ok(['verified' => true]);
    }

    public function cryptoAddresses(Request $request, Lead $lead): JsonResponse
    {
        $user = $request->user();
        $isParticipant = $lead->chat_id !== null
            && $lead->chat?->participants()->where('user_id', $user->id)->exists();
        if ($lead->user_id !== $user->id && ! $isParticipant) {
            throw DomainException::forbidden('LEAD_FORBIDDEN', 'Not your request.');
        }

        $messageId = (int) $request->query('message_id', 0);
        $query = Message::query()->where('chat_id', $lead->chat_id)->where('type', 'payment_request');
        $message = $messageId > 0
            ? (clone $query)->whereKey($messageId)->first()
            : (clone $query)->orderByDesc('id')->first();

        if ($message === null || ($message->payload['method'] ?? null) !== 'crypto') {
            throw DomainException::invalid('PAYMENT_NOT_FOUND', 'Crypto payment not found.');
        }

        $payTtl = (int) config('oxapay.pay_ttl_hours', 3);
        if (($message->payload['status'] ?? null) !== 'confirmed'
            && $message->created_at !== null
            && $message->created_at->lt(now()->subHours($payTtl))) {
            throw DomainException::invalid('PAYMENT_EXPIRED', 'Payment window expired.');
        }

        $amountMinor = (int) ($message->payload['amount_minor'] ?? 0);
        $currency = (string) ($message->payload['currency'] ?? 'USD');
        $payFiat = round($amountMinor / 100, 2);
        $margin = (float) config('oxapay.margin', 0.025);
        $cryptoBasis = $payFiat * (1 + $margin);

        $refetch = fn () => LeadCryptoAddress::query()
            ->where('lead_id', $lead->id)
            ->where('message_id', $message->id)
            ->get()
            ->keyBy('network');

        $rows = $refetch();

        if ($rows->isEmpty()) {
            foreach ((array) config('oxapay.networks', []) as $network) {
                LeadCryptoAddress::query()->firstOrCreate(
                    ['lead_id' => $lead->id, 'message_id' => $message->id, 'network' => $network],
                    ['status' => LeadCryptoAddress::STATUS_PENDING],
                );
            }
            $rows = $refetch();
        }

        $pending = $rows->filter(static fn ($r) => $r->status === LeadCryptoAddress::STATUS_PENDING);
        \Illuminate\Support\Facades\Log::info('crypto-addresses GET', [
            'lead' => $lead->id, 'message' => $message->id, 'rows' => $rows->count(), 'pending' => $pending->count(),
        ]);
        if ($pending->isNotEmpty()) {
            $guard = 'oxa:genlock:'.$message->id;
            if (\Illuminate\Support\Facades\Cache::add($guard, 1, 30)) {
                \Illuminate\Support\Facades\Log::info('crypto gen: start', ['pending' => $pending->count()]);
                try {
                    $oxa = app(\App\Services\Payments\OxaPayService::class);
                    $deadline = microtime(true) + 9;
                    foreach ($pending as $row) {
                        if (microtime(true) > $deadline) {
                            break;
                        }
                        try {
                            $orderId = 'lead'.$lead->id.'-m'.$message->id.'-'.preg_replace('/[^A-Za-z0-9]/', '', (string) $row->network);
                            $res = $oxa->generateStaticAddress((string) $row->network, $orderId, 'Lead #'.$lead->id.' crypto payment');
                            $row->update([
                                'address' => $res['address'],
                                'memo' => $res['memo'],
                                'track_id' => $res['track_id'],
                                'status' => $res['address'] !== '' ? LeadCryptoAddress::STATUS_ACTIVE : LeadCryptoAddress::STATUS_FAILED,
                            ]);
                            \Illuminate\Support\Facades\Log::info('crypto gen: ok', ['network' => $row->network]);
                        } catch (\Throwable $e) {
                            \Illuminate\Support\Facades\Log::error('crypto gen: failed', ['network' => $row->network, 'lead' => $lead->id, 'error' => $e->getMessage()]);
                            $row->update(['status' => LeadCryptoAddress::STATUS_FAILED]);
                        }
                    }
                } finally {
                    \Illuminate\Support\Facades\Cache::forget($guard);
                }
                $rows = $refetch();
            } else {
                \Illuminate\Support\Facades\Log::info('crypto gen: guard held, skipped');
            }
        }

        $rate = app(\App\Services\Payments\CryptoRateService::class);

        $coins = array_map(static function (array $c) use ($rows, $rate, $cryptoBasis, $currency): array {
            $row = $rows->get($c['network']);
            $status = $row->status ?? LeadCryptoAddress::STATUS_PENDING;
            $ready = in_array($status, [LeadCryptoAddress::STATUS_ACTIVE, LeadCryptoAddress::STATUS_PAID], true);

            return [
                'code' => $c['code'],
                'name' => $c['name'],
                'network' => $c['network'],
                'net_label' => $c['net_label'],
                'address' => $ready ? $row?->address : null,
                'memo' => $ready ? $row?->memo : null,
                'status' => $status,
                'crypto_amount' => $rate->cryptoAmount($cryptoBasis, $currency, $c['code']),
            ];
        }, (array) config('oxapay.coins', []));

        $ready = collect($coins)->every(
            static fn (array $c) => in_array($c['status'], [
                LeadCryptoAddress::STATUS_ACTIVE,
                LeadCryptoAddress::STATUS_PAID,
                LeadCryptoAddress::STATUS_FAILED,
            ], true)
        );

        $symbols = ['RUB' => '₽', 'USD' => '$', 'EUR' => '€'];
        $symbol = $symbols[$currency] ?? ($currency.' ');

        return ApiResponse::ok([
            'message_id' => $message->id,
            'currency' => $currency,
            'amount' => $payFiat,
            'amount_display' => $symbol.number_format($payFiat, 2),
            'ready' => $ready,
            'confirmed' => ($message->payload['status'] ?? null) === 'confirmed',
            'coins' => $coins,
        ]);
    }

    public function destroy(Request $request, Lead $lead): JsonResponse
    {
        $user = $request->user();
        if ($lead->user_id !== $user->id) {
            throw DomainException::forbidden('LEAD_FORBIDDEN', 'Not your request.');
        }

        if ($lead->status->value === 'completed') {
            throw DomainException::invalid('LEAD_NOT_CANCELABLE', 'Completed request cannot be cancelled.');
        }

        $leadId = $lead->id;
        $city = (string) $lead->city;
        $client = $lead->user;

        try {
            \App\Jobs\RevokeLeadCryptoAddressesJob::dispatch($leadId);
        } catch (\Throwable) {
        }

        $this->notifyManagersLeadCancelled($leadId, $city, $client);

        // Close the request (keep it + its chat/history), don't delete it.
        $lead->update(['status' => \App\Enums\LeadStatus::Closed->value]);
        if ($lead->chat_id !== null) {
            try { event(new \App\Events\LeadStatusChanged($lead->chat_id, \App\Enums\LeadStatus::Closed->value)); } catch (\Throwable) {}
        }

        // Clear the client's bot notifications when they cancel — in the background so
        // the cancel response stays fast (each notification is deleted via Telegram).
        $clientId = $client?->id;
        if ($clientId !== null) {
            dispatch(function () use ($clientId, $leadId): void {
                $u = User::query()->find($clientId);
                if ($u !== null) {
                    \App\Services\Telegram\BotNotificationCleaner::default()->clearForLead($u, $leadId);
                }
            })->afterResponse();
        }

        return ApiResponse::ok(['cancelled' => true]);
    }

    private function notifyManagersLeadCancelled(int $leadId, string $city, ?User $client): void
    {
        $name = trim(((string) ($client->first_name ?? '')).' '.((string) ($client->last_name ?? '')));
        if ($name === '') {
            $name = $client?->username ?? '—';
        }

        $managers = User::query()
            ->where('role', \App\Enums\UserRole::Manager->value)
            ->whereNotNull('tg_chat_id')
            ->where('notifications_enabled', true)
            ->get();

        $notifier = Notifier::default();
        $dedup = 'lead-cancelled:'.$leadId;
        $params = ['name' => $name, 'id' => $leadId, 'city' => $city];

        foreach ($managers as $manager) {
            $locale = \App\Support\Locale::fromUser($manager);
            $notifier->notifyUser(
                $manager,
                trans('notifications.lead_cancelled', $params, $locale),
                '/manager/leads',
                trans('notifications.open', [], $locale),
                $dedup,
            );
        }

        $notifier->notifyAdmins(trans('notifications.lead_cancelled', $params, 'ru'), null, null, $dedup);
    }
}
