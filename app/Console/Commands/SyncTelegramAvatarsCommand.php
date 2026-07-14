<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SyncTelegramAvatarJob;
use App\Models\User;
use Illuminate\Console\Command;

class SyncTelegramAvatarsCommand extends Command
{
    protected $signature = 'users:sync-avatars {--all : Обновить у всех, а не только у тех, у кого нет фото}';

    protected $description = 'Подтянуть аватарки пользователей из Telegram (для тех, кто пришёл через бота)';

    public function handle(): int
    {
        $query = User::query()
            ->whereNotNull('telegram_id')
            ->where('photo_customized', false);

        if (! $this->option('all')) {
            $query->where(fn ($q) => $q
                ->whereNull('photo_url')
                ->orWhere('photo_url', '')
                ->orWhere('photo_url', 'like', 'https://t.me/%'));
        }

        $count = 0;
        $query->select('id')->chunkById(200, function ($users) use (&$count): void {
            foreach ($users as $user) {
                SyncTelegramAvatarJob::dispatch($user->id);
                $count++;
            }
        });

        $this->info("Поставлено в очередь: {$count} аватарок.");

        return self::SUCCESS;
    }
}
