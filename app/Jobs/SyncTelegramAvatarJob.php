<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\User;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class SyncTelegramAvatarJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $userId) {}

    public function handle(): void
    {
        $user = User::query()->find($this->userId);
        if ($user === null || $user->telegram_id === null || $user->photo_customized) {
            return;
        }

        $bot = TelegramBotService::fromConfig();

        $fileId = $bot->getUserProfilePhotoFileId((int) $user->telegram_id);
        if ($fileId === null) {
            return;
        }
        $filePath = $bot->getFilePath($fileId);
        if ($filePath === null) {
            return;
        }
        $bytes = $bot->downloadFile($filePath);
        if ($bytes === null || $bytes === '') {
            return;
        }

        $ext = pathinfo($filePath, PATHINFO_EXTENSION) ?: 'jpg';
        $stored = 'avatars/'.$user->id.'.'.$ext;
        Storage::disk('public')->put($stored, $bytes);

        $user->forceFill(['photo_url' => '/storage/'.$stored])->save();
    }
}
