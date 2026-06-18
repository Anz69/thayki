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
     * Return the ONE shared requisites chat (all managers + requisites staff live
     * in it together) and make sure the given user is a participant.
     *
     * If more than one requisites chat exists — e.g. leftovers from the older
     * per-manager design or a creation race — every duplicate is folded into the
     * oldest one (messages + participants moved over) so the whole desk converges
     * onto a single chat with the full history.
     */
    public function execute(User $user): Chat
    {
        return DB::transaction(function () use ($user): Chat {

            $chats = Chat::query()
                ->where('type', ChatType::Requisites)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($chats->isEmpty()) {
                $chat = Chat::query()->create(['type' => ChatType::Requisites]);
            } else {
                $chat = $chats->first();
                $chats->slice(1)->each(fn (Chat $dup) => $this->fold($dup, $chat));
            }

            if (! $chat->participants()->where('user_id', $user->id)->exists()) {
                $chat->participants()->create([
                    'user_id' => $user->id,
                    'role' => $user->role === UserRole::Requisite
                        ? ChatParticipantRole::Requisites
                        : ChatParticipantRole::Support,
                ]);
            }

            return $chat->fresh();
        });
    }

    private function fold(Chat $dup, Chat $canonical): void
    {
        DB::table('messages')
            ->where('chat_id', $dup->id)
            ->update(['chat_id' => $canonical->id]);

        $existing = $canonical->participants()->pluck('user_id')->all();
        DB::table('chat_participants')
            ->where('chat_id', $dup->id)
            ->whereNotIn('user_id', $existing)
            ->update(['chat_id' => $canonical->id]);
        DB::table('chat_participants')->where('chat_id', $dup->id)->delete();

        $lastAt = DB::table('messages')->where('chat_id', $canonical->id)->max('created_at');
        if ($lastAt !== null) {
            $canonical->forceFill(['last_message_at' => $lastAt])->save();
        }

        $dup->delete();
    }
}
