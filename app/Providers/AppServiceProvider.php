<?php

declare(strict_types=1);

namespace App\Providers;

use App\Events\MessageSent;
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

    private function registerEventListeners(): void
    {
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

        RateLimiter::for('messages', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(60)->by($user !== null
                ? 'msg:'.$user->getAuthIdentifier()
                : 'msg-ip:'.$request->ip());
        });

    }
}
