<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Models\Chat;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EnsureSupportChatAction
{
    public function execute(User $user): Chat
    {
        return DB::transaction(function () use ($user): Chat {
            /** @var Chat|null $chat */
            $chat = Chat::query()
                ->where('type', ChatType::Support)
                ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
                ->lockForUpdate()
                ->first();

            if ($chat !== null) {
                return $chat;
            }

            $chat = Chat::query()->create(['type' => ChatType::Support]);
            $chat->participants()->create([
                'user_id' => $user->id,
                'role' => $user->role === UserRole::Model ? ChatParticipantRole::Model : ChatParticipantRole::Client,
            ]);

            return $chat;
        });
    }
}
