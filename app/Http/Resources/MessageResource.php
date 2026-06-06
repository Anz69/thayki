<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Message
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'chat_id'         => $this->chat_id,
            'sender_id'       => $this->sender_id,
            'client_message_id' => $this->client_message_id,
            'body'            => $this->body,
            'type'            => ($this->type && $this->type !== 'text')
                ? $this->type
                : ($this->attachment_path ? 'image' : 'text'),
            'payload'         => $this->payload,
            'attachment_url'  => $this->attachmentUrl(),
            'attachment_mime' => $this->attachment_mime,
            'read_at'         => $this->read_at?->toIso8601String(),
            'created_at'      => $this->created_at?->toIso8601String(),
            'user'            => $this->whenLoaded('sender', function () {
                $s = $this->sender;
                if (! $s) return null;
                return [
                    'id'     => $s->id,
                    'name'   => trim(($s->first_name ?? '').' '.($s->last_name ?? '')) ?: ($s->username ?? 'User'),
                    'avatar' => $s->photo_url,
                ];
            }),
            'is_support'      => $this->whenLoaded('sender', fn () =>
                in_array($this->sender?->role?->value, ['admin', 'support', 'manager'])
            ),
        ];
    }
}
