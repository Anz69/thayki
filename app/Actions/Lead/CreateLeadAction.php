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

            $locale = (isset($data['locale']) && in_array($data['locale'], ['ru', 'en'], true))
                ? $data['locale']
                : $this->localeFor($client);

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

    private function localeFor(User $client): string
    {
        $code = strtolower((string) ($client->language_code ?? ''));

        return str_starts_with($code, 'en') ? 'en' : 'ru';
    }
}
