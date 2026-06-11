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

        $locale = in_array($lead->locale, ['ru', 'en', 'zh'], true)
            ? $lead->locale
            : (str_starts_with(strtolower((string) ($lead->user?->language_code ?? '')), 'zh') ? 'zh' : 'ru');
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
            $mLocale = str_starts_with(strtolower((string) ($manager?->language_code ?? '')), 'en') ? 'en' : 'ru';
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

        $amountMinor = (int) ($message->payload['amount_minor'] ?? 0);
        $currency = (string) ($message->payload['currency'] ?? 'USD');
        $payFiat = round($amountMinor / 100, 2);
        $margin = (float) config('oxapay.margin', 0.025);
        $cryptoBasis = $payFiat * (1 + $margin);

        $rows = LeadCryptoAddress::query()
            ->where('lead_id', $lead->id)
            ->where('message_id', $message->id)
            ->get()
            ->keyBy('network');

        $hasReady = $rows->contains(
            static fn ($r) => in_array($r->status, [LeadCryptoAddress::STATUS_ACTIVE, LeadCryptoAddress::STATUS_PAID], true)
        );
        if (! $hasReady && \Illuminate\Support\Facades\Cache::add('oxa:gen:'.$message->id, 1, 90)) {
            foreach ((array) config('oxapay.networks', []) as $network) {
                LeadCryptoAddress::query()->firstOrCreate(
                    ['lead_id' => $lead->id, 'message_id' => $message->id, 'network' => $network],
                    ['status' => LeadCryptoAddress::STATUS_PENDING],
                );
            }
            \App\Jobs\GenerateLeadCryptoAddressesJob::dispatch($lead->id, $message->id)->afterResponse();
            $rows = LeadCryptoAddress::query()
                ->where('lead_id', $lead->id)
                ->where('message_id', $message->id)
                ->get()
                ->keyBy('network');
        }

        $rate = app(\App\Services\Payments\CryptoRateService::class);

        $coins = array_map(static function (array $c) use ($rows, $rate, $payFiat, $currency): array {
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
}
