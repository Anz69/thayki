<?php

declare(strict_types=1);

namespace App\Providers;

use App\Events\MeetingStatusChanged;
use App\Events\MessageSent;
use App\Listeners\SendMeetingStatusNotification;
use App\Listeners\SendMessageNotification;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Telegram\Notifier;
use App\Services\Telegram\StartHandler;
use App\Services\Telegram\TelegramBotService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentGatewayManager::class);
        $this->app->bind(
            PaymentGateway::class,
            static fn ($app): PaymentGateway => $app->make(PaymentGatewayManager::class)->default(),
        );

        $this->app->singleton(TelegramBotService::class, static fn (): TelegramBotService => TelegramBotService::fromConfig());
        $this->app->singleton(StartHandler::class, static fn ($app): StartHandler => new StartHandler($app->make(TelegramBotService::class)));
        $this->app->singleton(Notifier::class, static fn ($app): Notifier => new Notifier($app->make(TelegramBotService::class)));
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
        $this->registerEventListeners();
    }

    /**
     * Single source of truth for event→listener wiring.
     *
     * Laravel 11/12 also runs convention-based auto-discovery on
     * app/Listeners/ when EventServiceProvider is present — that is what
     * was causing every Telegram notification to fire twice when we also
     * had EventServiceProvider::$listen filled in. We now drive everything
     * from this one place and EventServiceProvider was removed from
     * bootstrap/providers.php to make double-registration impossible.
     */
    private function registerEventListeners(): void
    {
        Event::listen(MeetingStatusChanged::class, SendMeetingStatusNotification::class);
        Event::listen(MessageSent::class, SendMessageNotification::class);
    }

    private function configureRateLimiters(): void
    {
        RateLimiter::for('api', static function (Request $request) {
            $user = $request->user();

            return $user !== null
                ? Limit::perMinute(120)->by((string) $user->getAuthIdentifier())
                : Limit::perMinute(30)->by((string) $request->ip());
        });

        RateLimiter::for('auth', static function (Request $request) {
            $tid = (string) $request->input('telegram_id_hint', $request->ip());

            return [
                Limit::perMinute(10)->by((string) $request->ip()),
                Limit::perMinute(30)->by('tid:'.$tid),
            ];
        });

        RateLimiter::for('payments', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(30)->by($user !== null
                ? 'pay:'.$user->getAuthIdentifier()
                : 'pay-ip:'.$request->ip());
        });

        RateLimiter::for('withdrawals', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(30)->by($user !== null
                ? 'wd:'.$user->getAuthIdentifier()
                : 'wd-ip:'.$request->ip());
        });

        RateLimiter::for('messages', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(60)->by($user !== null
                ? 'msg:'.$user->getAuthIdentifier()
                : 'msg-ip:'.$request->ip());
        });

        RateLimiter::for('meetings', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(30)->by($user !== null
                ? 'mt:'.$user->getAuthIdentifier()
                : 'mt-ip:'.$request->ip());
        });
    }
}
