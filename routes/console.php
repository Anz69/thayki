<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-expire Pending meetings whose initial TTL has elapsed (sync queue
// driver doesn't honor delayed jobs, so this is the source of truth).
Schedule::command('meetings:expire-pending')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

