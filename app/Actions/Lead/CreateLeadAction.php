<?php

declare(strict_types=1);

namespace App\Actions\Lead;

use App\Actions\Chat\PostMessageAction;
use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\Lead;
use App\Models\ModelProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Creates a "подбор модели" lead, spins up a Lead chat with the client as
 * participant, and posts the client's request as the first message so a
 * manager can pick it up.
 *
 * @phpstan-type LeadInput array{
 *   model_profile_id?: int|null,
 *   city: string,
 *   hair_type?: string|null,
 *   age_range?: string|null,
 *   height_range?: string|null,
 *   goal?: string|null,
 *   wishes?: string|null,
 * }
 */
class CreateLeadAction
{
    public function __construct(private readonly PostMessageAction $postMessage) {}

    /**
     * @param  LeadInput  $data
     */
    public function execute(User $client, array $data): Lead
    {
        $lead = DB::transaction(function () use ($client, $data): Lead {
            $profile = null;
            if (! empty($data['model_profile_id'])) {
                $profile = ModelProfile::query()->find((int) $data['model_profile_id']);
            }

            $locale = (isset($data['locale']) && in_array($data['locale'], ['ru', 'en'], true))
                ? $data['locale']
                : $this->localeFor($client);

            /** @var Lead $lead */
            $lead = Lead::query()->create([
                'user_id' => $client->id,
                'model_profile_id' => $profile?->id,
                'city' => trim((string) $data['city']),
                'hair_type' => $data['hair_type'] ?? null,
                'age_range' => $data['age_range'] ?? null,
                'height_range' => $data['height_range'] ?? null,
                'goal' => $data['goal'] ?? null,
                'wishes' => isset($data['wishes']) ? trim((string) $data['wishes']) : null,
                'locale' => $locale,
                'status' => 'new',
                // Identity is verified once PER USER (phone_verified_at), not per
                // lead — so a client who already verified is shown as verified on
                // every subsequent lead instead of being asked again.
                'identity_verified_at' => $client->phone_verified_at !== null ? now() : null,
            ]);

            $chat = Chat::query()->create(['type' => ChatType::Lead]);
            $chat->participants()->create([
                'user_id' => $client->id,
                'role' => ChatParticipantRole::Client,
            ]);

            $lead->update(['chat_id' => $chat->id]);

            // The client builds the message in their UI language; if none was
            // supplied, fall back to a server-built message in the client's own
            // language (from their stored language_code), not always Russian.
            $body = (isset($data['message']) && trim((string) $data['message']) !== '')
                ? trim((string) $data['message'])
                : $this->formatMessage($lead, $profile, $locale);

            $this->postMessage->execute($client, $chat, $body);

            return $lead->fresh();
        });

        $this->notifyManagers($lead);

        return $lead;
    }

    /** Ping every manager about a brand-new lead so they can pick it up. */
    private function notifyManagers(Lead $lead): void
    {
        $managers = User::query()
            ->where('role', \App\Enums\UserRole::Manager->value)
            ->whereNotNull('tg_chat_id')
            ->where('notifications_enabled', true)
            ->get();

        $notifier = \App\Services\Telegram\Notifier::default();
        // The client's own request message (first message in the lead chat) so
        // the manager sees what was asked straight from the push. Strip the
        // redundant leading "📩 …" title line to keep the push tidy.
        $firstMessage = $lead->chat?->messages()->orderBy('id')->value('body');
        if (is_string($firstMessage)) {
            $lines = preg_split('/\r?\n/', $firstMessage) ?: [];
            if (isset($lines[0]) && str_starts_with(trim($lines[0]), '📩')) {
                array_shift($lines);
                while (isset($lines[0]) && trim($lines[0]) === '') {
                    array_shift($lines);
                }
            }
            $firstMessage = trim(implode("\n", $lines));
        }

        foreach ($managers as $manager) {
            $locale = str_starts_with(strtolower((string) ($manager->language_code ?? '')), 'en') ? 'en' : 'ru';
            $text = trans('notifications.new_lead', ['city' => $lead->city], $locale);
            if (is_string($firstMessage) && $firstMessage !== '') {
                $text .= "\n\n".$firstMessage;
            }
            $notifier->notifyUser(
                $manager,
                $text,
                '/manager/leads',
                trans('notifications.open', [], $locale),
                'new-lead:'.$lead->id,
            );
        }

        // Admins get the same single new-lead push (the generic per-message
        // notification is suppressed for the lead's first message).
        $adminText = trans('notifications.new_lead', ['city' => $lead->city], 'ru');
        if (is_string($firstMessage) && $firstMessage !== '') {
            $adminText .= "\n\n".$firstMessage;
        }
        $notifier->notifyAdmins($adminText, null, null, 'new-lead:'.$lead->id);
    }

    private function formatMessage(Lead $lead, ?ModelProfile $profile, string $locale = 'ru'): string
    {
        $L = fn (string $key): string => trans('lead.'.$key, [], $locale);

        $lines = [$L('title'), ''];

        if ($profile !== null) {
            $lines[] = $L('interested').': '.($locale === 'en' && $profile->display_name_en ? $profile->display_name_en : $profile->display_name);
        } elseif ($lead->hair_type) {
            $lines[] = $L('type').': '.$lead->hair_type;
        }

        $lines[] = $L('city').': '.$lead->city;

        if ($lead->age_range) {
            $lines[] = $L('age').': '.$lead->age_range;
        }
        if ($lead->height_range) {
            $lines[] = $L('height').': '.$lead->height_range;
        }
        if ($lead->goal) {
            $lines[] = $L('goal').': '.$lead->goal;
        }
        if ($lead->wishes) {
            $lines[] = ($profile !== null ? $L('wishes_extra') : $L('wishes')).': '.$lead->wishes;
        }

        return implode("\n", $lines);
    }

    /** Map the client's stored Telegram/app language to a supported locale. */
    private function localeFor(User $client): string
    {
        $code = strtolower((string) ($client->language_code ?? ''));

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
