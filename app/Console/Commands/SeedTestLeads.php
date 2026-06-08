<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\LeadStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Chat;
use App\Models\Lead;
use App\Models\Message;
use App\Models\ModelProfile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Seeds throwaway leads so the manager panel can be tested with realistic data.
 * Seeded rows are tagged (wishes = self::TAG) so `--clear` can remove them
 * without touching real leads. Creates NO Telegram notifications.
 */
class SeedTestLeads extends Command
{
    protected $signature = 'leads:seed-test {count=20 : How many test leads to create} {--clear : Delete previously seeded test leads first}';

    protected $description = 'Create N test leads (with clients, chats and a first message) for manager-panel testing';

    private const TAG = '[[seeded-test-lead]]';

    private const CITIES = ['Москва', 'Санкт-Петербург', 'Сочи', 'Казань', 'Дубай', 'Пхукет', 'Тбилиси', 'Минск', 'Екатеринбург', 'Omsk'];

    private const CLIENT_NAMES = ['Антон', 'Кирилл', 'Дмитрий', 'Игорь', 'Сергей', 'Павел', 'Максим', 'Олег', 'Роман', 'Артём'];

    /** Status distribution so every tab (new / active / closed) gets entries. */
    private const STATUSES = [
        LeadStatus::New, LeadStatus::New, LeadStatus::New,
        LeadStatus::InProgress, LeadStatus::InProgress,
        LeadStatus::AwaitingClient, LeadStatus::AwaitingPayment, LeadStatus::Prepaid,
        LeadStatus::Completed, LeadStatus::Closed,
    ];

    public function handle(): int
    {
        if ($this->option('clear')) {
            $cleared = $this->clearSeeded();
            $this->info("Removed {$cleared} previously seeded test leads.");
        }

        $count = max(1, (int) $this->argument('count'));

        $clients = $this->ensureClients();
        $manager = User::query()->where('role', UserRole::Manager->value)->first();
        $modelIds = ModelProfile::query()->inRandomOrder()->limit(40)->pluck('id')->all();

        $statuses = self::STATUSES;
        $created = 0;

        for ($i = 0; $i < $count; $i++) {
            $status = $statuses[$i % count($statuses)];
            $client = $clients[$i % count($clients)];
            $city = self::CITIES[$i % count(self::CITIES)];
            // ~70% of leads point at a real model so the card shows a photo/name.
            $modelId = ($modelIds !== [] && $i % 10 < 7) ? $modelIds[$i % count($modelIds)] : null;
            // Active/closed leads are "owned" by a manager; new ones are unassigned.
            $managerId = ($manager !== null && $status !== LeadStatus::New) ? $manager->id : null;
            $createdAt = now()->subHours(($i * 7) % 240)->subMinutes($i * 13 % 60);

            DB::transaction(function () use ($client, $city, $status, $modelId, $managerId, $createdAt): void {
                $chat = Chat::query()->create(['type' => ChatType::Lead, 'last_message_at' => $createdAt]);
                $chat->participants()->create(['user_id' => $client->id, 'role' => ChatParticipantRole::Client]);

                $lead = Lead::query()->create([
                    'user_id' => $client->id,
                    'manager_id' => $managerId,
                    'model_profile_id' => $modelId,
                    'city' => $city,
                    'goal' => 'Досуг',
                    'wishes' => self::TAG,
                    'status' => $status->value,
                    'chat_id' => $chat->id,
                    'locale' => 'ru',
                    'identity_verified_at' => $status === LeadStatus::New ? null : $createdAt,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);

                $modelLine = $modelId !== null
                    ? ('Интересует: '.(ModelProfile::query()->whereKey($modelId)->value('display_name') ?? 'модель'))
                    : 'Заявка по форме';

                Message::query()->create([
                    'chat_id' => $chat->id,
                    'sender_id' => $client->id,
                    'type' => 'text',
                    'body' => "📩 Заявка на подбор модели\n{$modelLine}\nГород: {$city}",
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);

                $lead->forceFill(['created_at' => $createdAt])->save();
            });

            $created++;
        }

        $this->info("Created {$created} test leads across new/active/closed tabs.");
        $this->line('Remove them later with:  php artisan leads:seed-test --clear');

        return self::SUCCESS;
    }

    /** Reuse existing test clients, creating a small pool if missing. */
    private function ensureClients(): array
    {
        $clients = [];
        foreach (self::CLIENT_NAMES as $idx => $name) {
            if ($idx >= 5) {
                break;
            }
            $telegramId = 990_000_000 + $idx; // safely out of real Telegram id range collisions for tests
            $clients[] = User::query()->firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'first_name' => $name,
                    'username' => 'test_client_'.$idx,
                    'role' => UserRole::Client,
                    'status' => UserStatus::Active,
                    'language_code' => 'ru',
                ],
            );
        }

        return $clients;
    }

    /** Delete seeded leads (and their chats/messages) created by this command. */
    private function clearSeeded(): int
    {
        $leads = Lead::query()->where('wishes', self::TAG)->get();
        $count = $leads->count();
        foreach ($leads as $lead) {
            if ($lead->chat_id !== null) {
                Message::query()->where('chat_id', $lead->chat_id)->delete();
                DB::table('chat_participants')->where('chat_id', $lead->chat_id)->delete();
            }
            $chatId = $lead->chat_id;
            $lead->delete();
            if ($chatId !== null) {
                Chat::query()->whereKey($chatId)->delete();
            }
        }

        return $count;
    }
}
