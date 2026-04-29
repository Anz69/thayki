<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Chat;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Chat
 */
class ChatResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $myId      = $request->user()?->id;
        $otherUser = $this->whenLoaded('participants', function () use ($myId) {
            $other = $this->participants->first(fn ($p) => $p->user_id !== $myId);
            if (! $other?->user) {
                return null;
            }
            $u = $other->user;
            return [
                'id'     => $u->id,
                'name'   => trim("{$u->first_name} {$u->last_name}") ?: ($u->username ? "@{$u->username}" : 'Пользователь'),
                'avatar' => $u->photo_url,
                'last_seen_at' => optional($u->last_seen_at ?? $u->last_auth_at)->toIso8601String(),
            ];
        });

        $myParticipant = $this->whenLoaded('participants', fn () =>
            $this->participants->first(fn ($p) => $p->user_id === $myId)
        );

        $lastMessage = $this->whenLoaded('lastMessage', function () {
            /** @var Message|null $msg */
            $msg = $this->lastMessage;
            if (! $msg) return null;
            return [
                'id'         => $msg->id,
                'sender_id'  => $msg->sender_id,
                'body'       => $msg->body ? mb_strimwidth($msg->body, 0, 120, '…') : null,
                'has_attachment' => $msg->attachment_path !== null,
                'created_at' => $msg->created_at?->toIso8601String(),
            ];
        });

        $unreadCount = $this->when(
            $myParticipant !== null,
            function () use ($myParticipant) {
                $precomputed = $this->getAttributeValue('unread_count_precomputed');
                if ($precomputed !== null) {
                    return (int) $precomputed;
                }

                $lastRead = $myParticipant->last_read_at;
                $query = Message::query()
                    ->where('chat_id', $this->id)
                    ->where('sender_id', '!=', $myParticipant->user_id);
                if ($lastRead !== null) {
                    $query->where('created_at', '>', $lastRead);
                }
                return $query->count();
            },
            0
        );

        return [
            'id'              => $this->id,
            'type'            => $this->type->value,
            'meeting_id'      => $this->meeting_id,
            'meeting_status'  => $this->whenLoaded('meeting', fn () => $this->meeting?->status?->value),
            'name'            => $this->whenLoaded('participants', function () use ($myId) {
                $other = $this->participants->first(fn ($p) => $p->user_id !== $myId);
                if (! $other?->user) return null;
                $u = $other->user;
                return trim("{$u->first_name} {$u->last_name}") ?: ($u->username ? "@{$u->username}" : 'Пользователь');
            }),
            'other_user'      => $otherUser,
            'last_message'    => $lastMessage,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'unread_count'    => $unreadCount,
            'participants'    => $this->whenLoaded('participants', fn () => $this->participants->map(fn ($p) => [
                'user_id'      => $p->user_id,
                'role'         => $p->role->value,
                'last_read_at' => $p->last_read_at?->toIso8601String(),
            ])),
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),
        ];
    }
}
