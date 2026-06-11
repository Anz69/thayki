<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Manager;

use App\Actions\Chat\PostMessageAction;
use App\Actions\Lead\AcceptLeadAction;
use App\Enums\ChatParticipantRole;
use App\Enums\LeadStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateLeadCryptoAddressesJob;
use App\Jobs\RevokeLeadCryptoAddressesJob;
use App\Models\Lead;
use App\Models\LeadCryptoAddress;
use App\Models\LeadPayment;
use App\Models\Message;
use App\Models\ModelProfile;
use App\Models\User;
use App\Services\Parsing\E100Parser;
use App\Services\Telegram\Notifier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerLeadController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $tab = (string) $request->query('tab', 'all');
        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        $query = Lead::query()->with(['user', 'manager', 'modelProfile.photos'])->latest();

        $query->when($tab === 'new', fn ($q) => $q->where('status', LeadStatus::New->value))
            ->when($tab === 'closed', fn ($q) => $q->whereIn('status', [LeadStatus::Closed->value, LeadStatus::Completed->value]))
            ->when($tab === 'active', fn ($q) => $q->whereNotIn('status', [
                LeadStatus::New->value, LeadStatus::Closed->value, LeadStatus::Completed->value,
            ]));

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $idMatch = (int) ltrim($search, '#');

            $cityTerms = \App\Support\CityAliases::expand($search);
            $query->where(function ($w) use ($search, $idMatch, $cityTerms) {
                $w->where(function ($cw) use ($cityTerms) {
                    foreach ($cityTerms as $term) {
                        $cw->orWhere('city', 'like', "%{$term}%");
                    }
                })
                    ->orWhereHas('user', fn ($u) => $u
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%"))
                    ->orWhereHas('modelProfile', fn ($m) => $m
                        ->where('display_name', 'like', "%{$search}%")
                        ->orWhere('display_name_en', 'like', "%{$search}%"));
                if ($idMatch > 0) {
                    $w->orWhere('id', $idMatch);
                }
            });
        }

        $paginator = $query->paginate($perPage);

        return ApiResponse::ok(
            $paginator->getCollection()->map(fn (Lead $lead) => $this->serialize($lead)),
            [
                'pagination' => [
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        );
    }

    public function show(Lead $lead): JsonResponse
    {
        return ApiResponse::ok($this->serialize($lead->load(['user', 'manager', 'modelProfile.photos'])));
    }

    public function accept(Lead $lead, AcceptLeadAction $action): JsonResponse
    {

        $manager = request()->user();
        $lead = $action->execute($manager, $lead);

        return ApiResponse::ok($this->serialize($lead->load(['user', 'manager', 'modelProfile.photos'])));
    }

    public function updateStatus(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', array_map(
                fn (LeadStatus $s) => $s->value,
                LeadStatus::managerSelectable(),
            ))],
        ]);

        $lead->update(['status' => $data['status']]);

        if (in_array($data['status'], [LeadStatus::Completed->value, LeadStatus::Closed->value], true)) {
            $paid = LeadCryptoAddress::query()
                ->where('lead_id', $lead->id)
                ->where('status', LeadCryptoAddress::STATUS_PAID)
                ->value('id');
            RevokeLeadCryptoAddressesJob::dispatch($lead->id, $paid)->afterResponse();
        }

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    public function paymentRequest(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['nullable', 'in:RUB,USD,EUR'],
            'method' => ['nullable', 'in:manual,crypto'],
            'requisites' => ['nullable', 'required_if:method,manual', 'string', 'max:2000'],
        ]);

        $manager = $request->user();
        $method = $data['method'] ?? 'manual';
        $currency = strtoupper($data['currency'] ?? 'THB');
        $amountMinor = (int) round(((float) $data['amount']) * 100);
        $locale = $this->leadLocale($lead);

        $message = $this->postCard($post, $manager, $lead, 'payment_request', [
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'method' => $method,
            'requisites' => $method === 'manual' ? trim((string) ($data['requisites'] ?? '')) : null,

            'pay_url' => null,
            'status' => 'pending',
        ], trans('lead.payment_body', ['amount' => $this->money($amountMinor, $currency)], $locale));

        if ($method === 'crypto' && $message !== null) {
            foreach ((array) config('oxapay.networks', []) as $network) {
                LeadCryptoAddress::query()->firstOrCreate(
                    ['lead_id' => $lead->id, 'message_id' => $message->id, 'network' => $network],
                    ['status' => LeadCryptoAddress::STATUS_PENDING],
                );
            }
            GenerateLeadCryptoAddressesJob::dispatch($lead->id, $message->id)->afterResponse();
        }

        $lead->update(['status' => LeadStatus::AwaitingPayment]);
        $this->pushClient($lead, trans('lead.payment_push', [], $locale));

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    public function paymentConfirm(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {

        $manager = $request->user();
        $locale = $this->leadLocale($lead);

        $messageId = (int) $request->input('message_id', 0);
        $base = Message::query()->where('chat_id', $lead->chat_id)->where('type', 'payment_request');
        $req = $messageId > 0
            ? (clone $base)->whereKey($messageId)->first()
            : (clone $base)->orderByDesc('id')->first();

        if ($req === null) {
            throw DomainException::invalid('PAYMENT_NOT_FOUND', 'Платёжный запрос не найден.');
        }

        if (($req->payload['status'] ?? null) === 'confirmed') {
            return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
        }

        $amountMinor = (int) ($req?->payload['amount_minor'] ?? 0);
        $currency = (string) ($req?->payload['currency'] ?? 'THB');
        $method = (string) ($req?->payload['method'] ?? 'manual');
        if ($request->filled('amount')) {
            $amountMinor = (int) round(((float) $request->input('amount')) * 100);
        }

        LeadPayment::query()->create([
            'lead_id' => $lead->id,
            'manager_id' => $manager->id,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'method' => $method,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        if ($req !== null) {
            $req->update(['payload' => array_merge($req->payload ?? [], ['status' => 'confirmed'])]);
        }

        $this->postCard($post, $manager, $lead, 'system', null,
            trans('lead.payment_confirmed', ['amount' => $this->money($amountMinor, $currency)], $locale));

        $lead->update(['status' => LeadStatus::Prepaid]);
        $this->pushClient($lead, trans('lead.payment_confirmed_push', [], $locale));

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    public function verificationRequest(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {

        $manager = $request->user();
        $locale = $this->leadLocale($lead);

        $this->postCard($post, $manager, $lead, 'verification_request',
            ['status' => $lead->identity_verified_at !== null ? 'done' : 'pending'],
            trans('lead.verification_body', [], $locale));

        $this->pushClient($lead, trans('lead.verification_push', [], $locale));

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    public function sendModels(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {
        $data = $request->validate([
            'model_profile_ids' => ['required', 'array', 'min:1'],
            'model_profile_ids.*' => ['integer'],
        ]);

        $manager = $request->user();
        $profiles = ModelProfile::query()->with('photos')
            ->whereIn('id', $data['model_profile_ids'])->get();

        if ($profiles->isEmpty()) {
            throw DomainException::invalid('NO_MODELS', 'No matching model profiles.');
        }

        $models = $profiles->map(fn (ModelProfile $p) => $this->modelCardData($p))->values()->all();
        $locale = $this->leadLocale($lead);

        $this->postCard($post, $manager, $lead, 'model_card', ['models' => $models],
            trans('lead.models_body', ['n' => count($models)], $locale));

        $this->pushClient($lead, trans('lead.models_push', [], $locale));

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    public function parseModel(Request $request, Lead $lead, E100Parser $parser): JsonResponse
    {
        $data = $request->validate([
            'url' => ['required', 'string', 'max:500', 'url'],
        ]);

        return ApiResponse::ok($parser->parse($data['url']));
    }

    public function sendParsed(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {
        $data = $request->validate([
            'models' => ['required', 'array', 'min:1'],
            'models.*.display_name' => ['nullable', 'string', 'max:255'],
            'models.*.age' => ['nullable', 'integer'],
            'models.*.height_cm' => ['nullable', 'integer'],
            'models.*.bust_cm' => ['nullable', 'integer'],
            'models.*.waist_cm' => ['nullable', 'integer'],
            'models.*.hips_cm' => ['nullable', 'integer'],
            'models.*.breast_size' => ['nullable', 'string', 'max:32'],
            'models.*.eyes' => ['nullable', 'string', 'max:64'],
            'models.*.hair' => ['nullable', 'string', 'max:64'],
            'models.*.description' => ['nullable', 'string', 'max:4000'],
            'models.*.photos' => ['nullable', 'array'],
            'models.*.photos.*' => ['string'],
            'models.*.videos' => ['nullable', 'array'],
            'models.*.videos.*.url' => ['required', 'string'],
            'models.*.videos.*.poster' => ['nullable', 'string'],
        ]);

        $manager = $request->user();

        $models = array_map(function (array $m): array {
            $photos = array_values(array_filter($m['photos'] ?? []));

            return [
                'id' => null,
                'source' => 'e100',
                'display_name' => $m['display_name'] ?? null,
                'display_name_en' => null,
                'photo' => $photos[0] ?? null,
                'age' => $m['age'] ?? null,
                'height_cm' => $m['height_cm'] ?? null,
                'bust_cm' => $m['bust_cm'] ?? null,
                'waist_cm' => $m['waist_cm'] ?? null,
                'hips_cm' => $m['hips_cm'] ?? null,
                'breast_size' => $m['breast_size'] ?? null,
                'eyes' => $m['eyes'] ?? null,
                'description' => $m['description'] ?? null,
                'photos' => $photos,
                'videos' => array_values(array_map(
                    fn (array $v) => ['url' => $v['url'], 'poster' => $v['poster'] ?? null],
                    $m['videos'] ?? [],
                )),
            ];
        }, $data['models']);

        $locale = $this->leadLocale($lead);
        $this->postCard($post, $manager, $lead, 'model_card', ['models' => $models],
            trans('lead.models_body', ['n' => count($models)], $locale));
        $this->pushClient($lead, trans('lead.models_push', [], $locale));

        return ApiResponse::ok($this->serialize($lead->fresh(['user', 'manager', 'modelProfile.photos'])));
    }

    private function postCard(PostMessageAction $post, User $manager, Lead $lead, string $type, ?array $payload, ?string $body): ?Message
    {
        $chat = $lead->chat;
        if ($chat === null) {
            return null;
        }
        if (! $chat->participants()->where('user_id', $manager->id)->exists()) {
            $chat->participants()->create([
                'user_id' => $manager->id,
                'role' => ChatParticipantRole::Support,
            ]);
        }

        return $post->execute($manager, $chat->fresh(['participants']), $body, null, null, $type, $payload);
    }

    private function pushClient(Lead $lead, string $text): void
    {
        $client = $lead->user;
        if ($client === null || $lead->chat_id === null) {
            return;
        }
        Notifier::default()->notifyUser(
            $client,
            $text,
            "/request/chat?id={$lead->chat_id}&lead={$lead->id}",
            trans('notifications.open_chat', [], $this->leadLocale($lead)),
            'lead-event:'.$lead->id.':'.substr(md5($text), 0, 8),
        );
    }

    private function leadLocale(Lead $lead): string
    {
        if (in_array($lead->locale, ['ru', 'en', 'zh'], true)) {
            return $lead->locale;
        }
        $code = strtolower((string) ($lead->user?->language_code ?? ''));

        if (str_starts_with($code, 'zh')) {
            return 'zh';
        }

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }

    private function money(int $minor, string $currency): string
    {
        $amount = number_format($minor / 100, 0, '.', ' ');
        $symbol = $currency === 'THB' ? '฿' : ($currency === 'USD' ? '$' : $currency.' ');

        return $symbol.$amount;
    }

    private function modelCardData(ModelProfile $p): array
    {
        $photos = $p->photos
            ->sortByDesc(fn ($ph) => $ph->is_main)
            ->map(fn ($ph) => $ph->getUrl())
            ->values()
            ->all();

        return [
            'id' => $p->id,
            'display_name' => $p->display_name,
            'display_name_en' => $p->display_name_en,
            'photo' => $photos[0] ?? null,
            'age' => $p->age,
            'height_cm' => $p->height_cm,
            'photos' => $photos,
        ];
    }

    private function serialize(Lead $lead): array
    {
        $profile = $lead->modelProfile;
        $main = $profile
            ? ($profile->photos->firstWhere('is_main', true) ?? $profile->photos->first())
            : null;
        $client = $lead->user;

        return [
            'id' => $lead->id,
            'chat_id' => $lead->chat_id,
            'status' => $lead->status->value,
            'city' => $lead->city,
            'hair_type' => $lead->hair_type,
            'age_range' => $lead->age_range,
            'height_range' => $lead->height_range,
            'goal' => $lead->goal,
            'is_vip' => $lead->isVip(),
            'wishes' => $lead->wishes,
            'created_at' => $lead->created_at?->toIso8601String(),
            'manager_id' => $lead->manager_id,
            'identity_verified' => $lead->identity_verified_at !== null,
            'client' => $client ? [
                'name' => trim(($client->first_name ?? '').' '.($client->last_name ?? '')) ?: ($client->username ?? '—'),
                'username' => $client->username,
                'photo' => $client->photo_url,

                'phone' => $lead->identity_verified_at !== null ? $client->phone_number : null,
            ] : null,
            'model' => $profile ? [
                'id' => $profile->id,
                'display_name' => $profile->display_name,
                'display_name_en' => $profile->display_name_en,
                'photo' => $main?->getUrl(),
                'age' => $profile->age,
                'height_cm' => $profile->height_cm,
                'bust_cm' => $profile->bust_cm,
                'waist_cm' => $profile->waist_cm,
                'hips_cm' => $profile->hips_cm,
                'eyes' => $profile->eyes,
                'breast_size' => $profile->breast_size,
                'description' => $profile->description,
                'is_verified' => $profile->is_verified,
                'photos' => $profile->photos
                    ->sortByDesc(fn ($p) => $p->is_main)
                    ->map(fn ($p) => $p->getUrl())
                    ->values()
                    ->all(),
            ] : null,
        ];
    }
}
