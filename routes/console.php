<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('oxapay:cleanup-addresses')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('model-cards:cleanup')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('bot:cleanup-notifications')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground();

