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
        // Tells the legacy ServiceProvider's $listen-merging path that we
        // don't want it walking app/Listeners/ again on top of Laravel 11's
        // built-in auto-discovery. Belt-and-braces; together with the empty
        // $listen above, no listener is ever registered more than once.
        return false;
    }
}
