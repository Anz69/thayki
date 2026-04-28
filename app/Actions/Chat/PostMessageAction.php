<?php

declare(strict_types=1);

namespace App\Actions\Chat;

use App\Events\MessageSent;
use App\Exceptions\DomainException;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use App\Support\SafeFileExtension;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
                try {
                    $ext = SafeFileExtension::forChatAttachment($attachment);
                } catch (\RuntimeException $e) {
                    throw DomainException::invalid('UNSUPPORTED_FILE', 'Unsupported attachment type.');
                }

                $mime = (string) $attachment->getMimeType();
                $name = Str::uuid()->toString().'.'.$ext;
                $dir  = 'chat-attachments/'.$chat->id;
                try {
                    \Illuminate\Support\Facades\Storage::disk($disk)
                        ->putFileAs($dir, $attachment, $name, 'public');
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('[PostMessageAction] putFileAs failed', [
                        'chat_id' => $chat->id,
                        'disk'    => $disk,
                        'mime'    => $mime,
                        'error'   => $e->getMessage(),
                    ]);
                    throw DomainException::invalid(
                        'ATTACHMENT_STORAGE_FAILED',
                        'Не удалось сохранить вложение, попробуйте ещё раз.',
                    );
                }
                $path = $dir.'/'.$name;
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
        }

        return $message;
    }
}
