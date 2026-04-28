<?php

declare(strict_types=1);

namespace App\Providers;

use App\Events\MessageSent;
use App\Events\MeetingStatusChanged;
use App\Listeners\SendMessageNotification;
use App\Listeners\SendMeetingStatusNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        MessageSent::class => [
            SendMessageNotification::class,
        ],
        MeetingStatusChanged::class => [
            SendMeetingStatusNotification::class,
        ],
    ];

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
