<?php

declare(strict_types=1);

namespace App\Actions\Lead;

use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatParticipantRole;
use App\Enums\LeadStatus;
use App\Exceptions\DomainException;
use App\Models\Lead;
use App\Models\User;
use App\Services\Telegram\Notifier;
use Illuminate\Support\Facades\DB;

/**
 * A manager picks up a lead: assigns themselves, moves it to "in progress",
 * joins the lead chat, posts a system note, and notifies the client.
 */
class AcceptLeadAction
{
    public function __construct(private readonly PostMessageAction $postMessage) {}

    public function execute(User $manager, Lead $lead): Lead
    {
        $chat = DB::transaction(function () use ($manager, $lead) {
            /** @var Lead $lead */
            $lead = Lead::query()->lockForUpdate()->findOrFail($lead->id);

            if ($lead->manager_id !== null && $lead->manager_id !== $manager->id) {
                throw DomainException::forbidden('LEAD_TAKEN', 'Заявка уже взята другим менеджером.');
            }

            $lead->manager_id = $manager->id;
            if ($lead->status === LeadStatus::New) {
                $lead->status = LeadStatus::InProgress;
            }
            $lead->save();

            $chat = $lead->chat;
            if ($chat !== null
                && ! $chat->participants()->where('user_id', $manager->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $manager->id,
                    'role' => ChatParticipantRole::Support,
                ]);
            }

            return $chat;
        });

        if ($chat !== null) {
            $client = $lead->user;
            $locale = in_array($lead->locale, ['ru', 'en'], true)
                ? $lead->locale
                : (str_starts_with(strtolower((string) ($client?->language_code ?? '')), 'en') ? 'en' : 'ru');

            // System note inside the chat (client + manager see it).
            $this->postMessage->execute(
                $manager,
                $chat->fresh(['participants']),
                trans('lead.manager_joined', [], $locale),
                null,
                null,
                'system',
            );

            // Telegram push to the client — DEFERRED to after the HTTP response.
            // The bot API call can take up to 5s; running it inline made the
            // manager's "Accept" spin for seconds. afterResponse() sends it once
            // the manager already has their response and is in the chat.
            if ($client !== null) {
                $clientId = $client->id;
                $chatId = $chat->id;
                $leadId = $lead->id;
                dispatch(function () use ($clientId, $chatId, $leadId, $locale): void {
                    $client = User::query()->find($clientId);
                    if ($client === null) {
                        return;
                    }
                    Notifier::default()->notifyUser(
                        $client,
                        trans('lead.manager_joined_push', [], $locale),
                        "/request/chat?id={$chatId}&lead={$leadId}",
                        trans('notifications.open_chat', [], $locale),
                        'lead-accepted:'.$leadId,
                    );
                })->afterResponse();
            }
        }

        return $lead->fresh();
    }
}
