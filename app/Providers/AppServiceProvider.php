<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
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

        // Meeting state-change actions (accept/reject/cancel/confirm/complete).
        // Generic api throttle (120/min) is too permissive for mutations that
        // affect financial state. 30/min per user is plenty for legitimate use.
        RateLimiter::for('meetings', static function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(30)->by($user !== null
                ? 'mt:'.$user->getAuthIdentifier()
                : 'mt-ip:'.$request->ip());
        });
    }
}
