<?php

declare(strict_types=1);

namespace App\Providers;

use App\Events\MeetingStatusChanged;
use App\Events\MessageSent;
use App\Listeners\SendMeetingStatusNotification;
use App\Listeners\SendMessageNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, list<class-string>>
     */
    protected $listen = [
        MeetingStatusChanged::class => [
            SendMeetingStatusNotification::class,
        ],
        MessageSent::class => [
            SendMessageNotification::class,
        ],
    ];

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
