<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RoadmapStatus;
use App\Models\RoadmapItem;
use Illuminate\Database\Seeder;

class RoadmapSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['Telegram Mini App auth', 'HMAC initData verification, anti-replay, Sanctum tokens', RoadmapStatus::Done],
            ['Model catalog & filters', 'Public listing with pricing and schedule filters', RoadmapStatus::Done],
            ['Booking flow', 'Create meeting → accept → pay → confirm', RoadmapStatus::InProgress],
            ['Chat & support', 'Real-time chat via Reverb websockets', RoadmapStatus::InProgress],
            ['Payments (USDT/BTC/TON)', 'Automated on-chain payment verification', RoadmapStatus::Planned],
            ['Push notifications via bot', 'Outbound Telegram notifications', RoadmapStatus::Planned],
        ];

        foreach ($items as $index => [$title, $description, $status]) {
            RoadmapItem::query()->updateOrCreate(
                ['title' => $title],
                [
                    'description' => $description,
                    'status' => $status,
                    'position' => $index,
                ],
            );
        }
    }
}
