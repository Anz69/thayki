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
use App\Models\Message;
use App\Models\User;
use App\Services\Telegram\Notifier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    /** Current user's submitted requests, newest first. */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        $paginator = Lead::query()
            ->where('user_id', $user->id)
            ->with(['modelProfile.photos'])
            // Active leads first, finished (completed/closed) last; newest within each.
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
        /** @var User $user */
        $user = $request->user();

        $lead = $action->execute($user, $request->validated());

        return ApiResponse::created([
            'lead_id' => $lead->id,
            'chat_id' => $lead->chat_id,
        ]);
    }

    /**
     * The client confirms their identity by sharing their Telegram contact
     * (phone) through the Mini App. We store it on the user, mark the lead
     * verified, post a system note, and notify the assigned manager.
     */
    public function verifyContact(Request $request, Lead $lead, PostMessageAction $post): JsonResponse
    {
        /** @var User $user */
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

        $locale = in_array($lead->locale, ['ru', 'en'], true) ? $lead->locale : 'ru';
        $chat = $lead->chat;
        if ($chat !== null) {
            if (! $chat->participants()->where('user_id', $user->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $user->id,
                    'role' => ChatParticipantRole::Client,
                ]);
            }
            // Flip any pending verification_request card to "done".
            Message::query()->where('chat_id', $chat->id)
                ->where('type', 'verification_request')
                ->latest('id')->first()?->update(['payload' => ['status' => 'done']]);

            $post->execute($user, $chat->fresh(['participants']),
                trans('lead.verification_done', [], $locale), null, null, 'system');
        }

        // Notify the manager in Telegram that verification passed.
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
}
