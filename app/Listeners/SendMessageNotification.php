<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\MessageSent;
use App\Jobs\SendChatMessageNotificationJob;
use Illuminate\Support\Facades\Log;

class SendMessageNotification
{
    public function handle(MessageSent $event): void
    {
        try {
            $message = $event->message;
            if ($message === null || $message->id === null) {
                return;
            }

            SendChatMessageNotificationJob::dispatch($message->id)->afterResponse();
        } catch (\Throwable $e) {
            Log::warning('[SendMessageNotification] failed to dispatch', [
                'message_id' => $event->message->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
