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

            // Match only the chat the user OWNS (their participant role is
            // Client/Model) — never one where they're staff. Managers get added
            // to clients' support chats as Support when they reply, so a plain
            // "is a participant" match would hand them someone else's history.
            $ownerRoles = [ChatParticipantRole::Client->value, ChatParticipantRole::Model->value];

            $chat = Chat::query()
                ->where('type', ChatType::Support)
                ->whereHas('participants', fn ($q) => $q
                    ->where('user_id', $user->id)
                    ->whereIn('role', $ownerRoles))
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
