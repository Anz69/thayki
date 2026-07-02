<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\BotNotificationCleaner;
use Illuminate\Console\Command;

class CleanupBotNotificationsCommand extends Command
{
    protected $signature = 'bot:cleanup-notifications {--hours=48 : Возраст уведомлений для удаления}';

    protected $description = 'Удалить уведомления бота у клиентов старше N часов (по умолчанию 48)';

    public function handle(BotNotificationCleaner $cleaner): int
    {
        $hours = (int) $this->option('hours');
        $deleted = $cleaner->clearOlderThan($hours > 0 ? $hours : 48);

        $this->info("Удалено уведомлений: {$deleted}.");

        return self::SUCCESS;
    }
}
