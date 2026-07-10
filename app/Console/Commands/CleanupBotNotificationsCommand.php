<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Telegram\BotNotificationCleaner;
use Illuminate\Console\Command;

class CleanupBotNotificationsCommand extends Command
{
    protected $signature = 'bot:cleanup-notifications {--hours=46 : Возраст уведомлений для удаления}';

    protected $description = 'Удалить уведомления бота у клиентов старше N часов (по умолчанию 46 — в пределах 48ч-лимита Telegram)';

    public function handle(BotNotificationCleaner $cleaner): int
    {
        $hours = (int) $this->option('hours');
        $deleted = $cleaner->clearOlderThan($hours > 0 ? $hours : 46);

        $this->info("Удалено уведомлений: {$deleted}.");

        return self::SUCCESS;
    }
}
