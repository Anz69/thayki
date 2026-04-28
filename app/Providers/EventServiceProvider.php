<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

/**
 * Listener registration is delegated entirely to Laravel 11+'s convention
 * auto-discovery (handle($event) type-hint -> registered for that event).
 *
 * IMPORTANT: do NOT also fill the `$listen` array here. Auto-discovery
 * runs unconditionally in Laravel 11/12 and any duplicate registration via
 * `$listen` causes the listener to fire twice — which is why the original
 * version of this file shipped with `SendMeetingStatusNotification` AND
 * `SendMessageNotification` mapped explicitly was sending every Telegram
 * notification twice.
 */
class EventServiceProvider extends ServiceProvider
{
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
