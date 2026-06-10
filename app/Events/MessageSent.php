<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly Message $message) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chats.'.$this->message->chat_id)];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        $sender = $this->message->relationLoaded('sender')
            ? $this->message->sender
            : $this->message->sender()->first();

        return [
            'id'              => $this->message->id,
            'chat_id'         => $this->message->chat_id,
            'sender_id'       => $this->message->sender_id,
            'client_message_id' => $this->message->client_message_id,
            'body'            => $this->message->body,
            'type'            => ($this->message->type && $this->message->type !== 'text')
                ? $this->message->type
                : ($this->message->attachment_path ? 'image' : 'text'),
            'payload'         => $this->message->payload,
            'attachment_url'  => $this->message->attachmentUrl(),
            'attachment_mime' => $this->message->attachment_mime,
            'created_at'      => $this->message->created_at?->toIso8601String(),
            'user'            => $sender ? [
                'id'     => $sender->id,
                'name'   => trim(($sender->first_name ?? '').' '.($sender->last_name ?? '')) ?: ($sender->username ?? 'User'),
                'avatar' => $sender->photo_url,
            ] : null,
        ];
    }
}
