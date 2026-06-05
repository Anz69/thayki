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
        return DB::transaction(function () use ($client, $data): Lead {
            $profile = null;
            if (! empty($data['model_profile_id'])) {
                $profile = ModelProfile::query()->find((int) $data['model_profile_id']);
            }

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
                'status' => 'new',
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
                : $this->formatMessage($lead, $profile, $this->localeFor($client));

            $this->postMessage->execute($client, $chat, $body);

            return $lead->fresh();
        });
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
