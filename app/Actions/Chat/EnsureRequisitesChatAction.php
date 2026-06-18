<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Enums\UserRole;
use App\Models\Chat;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EnsureRequisitesChatAction
{
    /**
     * Find (or create) the single shared requisites chat and make sure the
     * given user (manager / admin / requisites) is a participant of it.
     */
    public function execute(User $user): Chat
    {
        return DB::transaction(function () use ($user): Chat {

            $chat = Chat::query()
                ->where('type', ChatType::Requisites)
                ->lockForUpdate()
                ->first();

            if ($chat === null) {
                $chat = Chat::query()->create(['type' => ChatType::Requisites]);
            }

            if (! $chat->participants()->where('user_id', $user->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $user->id,
                    'role' => $user->role === UserRole::Requisite
                        ? ChatParticipantRole::Requisites
                        : ChatParticipantRole::Support,
                ]);
            }

            return $chat;
        });
    }
}
