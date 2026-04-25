<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Events\MessageSent;
use App\Exceptions\DomainException;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class PostMessageAction
{
    public function execute(User $sender, Chat $chat, ?string $body, ?UploadedFile $attachment = null): Message
    {
        if (! $chat->isParticipant($sender)) {
            throw DomainException::forbidden('CHAT_FORBIDDEN', 'You are not a participant of this chat.');
        }

        if (($body === null || trim($body) === '') && $attachment === null) {
            throw DomainException::invalid('MESSAGE_EMPTY', 'Message body or attachment is required.');
        }

        $message = DB::transaction(function () use ($sender, $chat, $body, $attachment): Message {
            $disk = (string) config('filesystems.default', 'public');
            $path = null;
            $mime = null;

            if ($attachment !== null) {
                $path = $attachment->store('chat-attachments/'.$chat->id, $disk);
                $mime = $attachment->getMimeType();
            }

            /** @var Message $message */
            $message = Message::query()->create([
                'chat_id'          => $chat->id,
                'sender_id'        => $sender->id,
                'body'             => $body,
                'attachment_disk'  => $path !== null ? $disk : null,
                'attachment_path'  => $path,
                'attachment_mime'  => $mime,
            ]);

            $chat->update(['last_message_at' => $message->created_at]);

            return $message;
        });

        $message->load('sender');

        try {
            event(new MessageSent($message));
        } catch (\Throwable) {
            // Broadcasting failure must not break message delivery
        }

        return $message;
    }
}
