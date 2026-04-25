<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Enums\ChatParticipantRole;
use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\Meeting;
use Illuminate\Support\Facades\DB;

class EnsureMeetingChatAction
{
    public function execute(Meeting $meeting): Chat
    {
        return DB::transaction(function () use ($meeting): Chat {
            /** @var Chat $chat */
            $chat = Chat::query()->firstOrCreate(
                ['meeting_id' => $meeting->id],
                ['type' => ChatType::Meeting],
            );

            $modelOwnerId = (int) $meeting->modelProfile()->value('user_id');

            $chat->participants()->firstOrCreate(
                ['user_id' => $meeting->client_id],
                ['role' => ChatParticipantRole::Client],
            );
            $chat->participants()->firstOrCreate(
                ['user_id' => $modelOwnerId],
                ['role' => ChatParticipantRole::Model],
            );

            return $chat;
        });
    }
}
