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
            $locale = str_starts_with(strtolower((string) ($client?->language_code ?? '')), 'en') ? 'en' : 'ru';

            // System note inside the chat (client + manager see it).
            $this->postMessage->execute(
                $manager,
                $chat->fresh(['participants']),
                trans('lead.manager_joined', [], $locale),
                null,
                null,
                'system',
            );

            // Telegram push to the client.
            if ($client !== null) {
                Notifier::default()->notifyUser(
                    $client,
                    trans('lead.manager_joined_push', [], $locale),
                    "/request/chat?id={$chat->id}&lead={$lead->id}",
                    trans('notifications.open_chat', [], $locale),
                    'lead-accepted:'.$lead->id,
                );
            }
        }

        return $lead->fresh();
    }
}
