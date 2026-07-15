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

class CreateLeadAction
{
    public function __construct(private readonly PostMessageAction $postMessage) {}

    public function execute(User $client, array $data): Lead
    {
        $lead = DB::transaction(function () use ($client, $data): Lead {
            $profile = null;
            if (! empty($data['model_profile_id'])) {
                $profile = ModelProfile::query()->find((int) $data['model_profile_id']);
            }

            $locale = (isset($data['locale']) && in_array($data['locale'], ['ru', 'en', 'zh'], true))
                ? $data['locale']
                : $this->localeFor($client);

            $int = static fn (string $key) => isset($data[$key]) && $data[$key] !== '' && $data[$key] !== null
                ? (int) $data[$key]
                : null;
            $str = static fn (string $key) => isset($data[$key]) && trim((string) $data[$key]) !== ''
                ? trim((string) $data[$key])
                : null;

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

                'age_from' => $int('age_from'),
                'age_to' => $int('age_to'),
                'height_from' => $int('height_from'),
                'height_to' => $int('height_to'),
                'bust_type' => $str('bust_type'),
                'bust_size' => $str('bust_size'),
                'weight_from' => $int('weight_from'),
                'weight_to' => $int('weight_to'),
                'figure' => $str('figure'),
                'hips' => $str('hips'),
                'event_type' => $str('event_type'),
                'event_hours_from' => $int('event_hours_from'),
                'event_hours_to' => $int('event_hours_to'),
                'trip_days_from' => $int('trip_days_from'),
                'trip_days_to' => $int('trip_days_to'),
                'trip_city' => $str('trip_city'),
                'trip_purpose' => $str('trip_purpose'),

                'identity_verified_at' => $client->phone_verified_at !== null ? now() : null,
            ]);

            $chat = Chat::query()->create(['type' => ChatType::Lead]);
            $chat->participants()->create([
                'user_id' => $client->id,
                'role' => ChatParticipantRole::Client,
            ]);

            $lead->update(['chat_id' => $chat->id]);

            $body = (isset($data['message']) && trim((string) $data['message']) !== '')
                ? trim((string) $data['message'])
                : $this->formatMessage($lead, $profile, $locale);

            $this->postMessage->execute($client, $chat, $body);

            return $lead->fresh();
        });

        $this->notifyManagers($lead);

        return $lead;
    }

    private function notifyManagers(Lead $lead): void
    {
        $managers = User::query()
            ->where('role', \App\Enums\UserRole::Manager->value)
            ->whereNotNull('tg_chat_id')
            ->where('notifications_enabled', true)
            ->get();

        $notifier = \App\Services\Telegram\Notifier::default();

        // Managers/admins read the lead in THEIR language (not the client's) — rebuild
        // the card in the viewer's language and append the client's language line.
        $profile = $lead->modelProfile;
        // The language the client actually uses = the language of the request they filled
        // in (their app UI), not their Telegram account language.
        $clientLocale = \App\Support\Locale::normalize($lead->locale, $lead->user?->language_code);

        $clientUsername = $lead->user?->username;

        $build = function (string $locale) use ($lead, $profile, $clientLocale, $clientUsername): string {
            $text = trans('notifications.new_lead', ['city' => $lead->city], $locale);
            if ($clientUsername) {
                $text .= "\n👤 @".e($clientUsername);
            }
            $body = $this->cardBody($lead, $profile, $locale);
            if ($body !== '') {
                $text .= "\n\n".$body;
            }
            $text .= "\n\n".trans('notifications.client_language', [
                'lang' => trans('notifications.lang_'.$clientLocale, [], $locale),
            ], $locale);

            return $text;
        };

        foreach ($managers as $manager) {
            $locale = \App\Support\Locale::fromUser($manager);
            $notifier->notifyUser(
                $manager,
                $build($locale),
                '/manager/leads',
                trans('notifications.open', [], $locale),
                'new-lead:'.$lead->id,
            );
        }

        $notifier->notifyAdmins($build('ru'), null, null, 'new-lead:'.$lead->id);
    }

    private function cardBody(Lead $lead, ?ModelProfile $profile, string $locale): string
    {
        $lines = preg_split('/\r?\n/', $this->formatMessage($lead, $profile, $locale)) ?: [];
        if (isset($lines[0]) && str_starts_with(trim($lines[0]), '📩')) {
            array_shift($lines);
            while (isset($lines[0]) && trim($lines[0]) === '') {
                array_shift($lines);
            }
        }

        return trim(implode("\n", $lines));
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

    private function localeFor(User $client): string
    {
        $code = strtolower((string) ($client->language_code ?? ''));

        if (str_starts_with($code, 'zh')) {
            return 'zh';
        }

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
