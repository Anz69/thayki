<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EnsureRequisitesChatAction
{
    /**
     * Find or create the requisites chat owned by the given manager.
     * Requisites staff are added as participants when they first reply.
     */
    public function execute(User $manager): Chat
    {
        return DB::transaction(function () use ($manager): Chat {

            $chat = Chat::query()
                ->where('type', ChatType::Requisites)
                ->whereHas('participants', fn ($q) => $q->where('user_id', $manager->id))
                ->lockForUpdate()
                ->first();

            if ($chat !== null) {
                return $chat;
            }

            $chat = Chat::query()->create(['type' => ChatType::Requisites]);
            $chat->participants()->create([
                'user_id' => $manager->id,
                'role' => ChatParticipantRole::Support,
            ]);

            return $chat;
        });
    }
}
