<?php

declare(strict_types=1);

use App\Exceptions\ApiException;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsVerified;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IdempotencyKey;
use App\Http\Middleware\TouchLastSeen;
use App\Http\Middleware\VerifyTelegramInitData;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureRole::class,
            'telegram.initdata' => VerifyTelegramInitData::class,
            'idempotency' => IdempotencyKey::class,
            'force.json' => ForceJsonResponse::class,
            'touch.last_seen' => TouchLastSeen::class,
            'active' => EnsureUserIsActive::class,
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
            ForceJsonResponse::class,
        ]);

        // Append after authentication so $request->user() is populated.
        // EnsureUserIsActive 403's any banned user and revokes their
        // current Sanctum token on the way out — without this a banned
        // user can keep using the API forever, because Sanctum tokens
        // remain valid until explicitly deleted.
        // EnsureUserIsVerified is the server-side enforcement of the
        // "double-bottom" flow — strange users can authenticate and read
        // their own profile, but cannot reach catalog / booking / chats.
        $middleware->api(append: [
            EnsureUserIsActive::class,
            EnsureUserIsVerified::class,
        ]);

        // Telegram bot webhooks come in as POSTs from Telegram's servers and
        // can never carry a CSRF token. Without this exception every update
        // bounces with HTTP 419 and Telegram retries forever (then disables
        // the webhook). The URL is already protected by the secret-in-path
        // pattern (see TelegramBotWebhookController + telegram.webhook_secret).
        $middleware->validateCsrfTokens(except: [
            'telegram/webhook/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(static function (Request $request): bool {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (ApiException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error(
                $e->errorCode,
                $e->getMessage(),
                $e->details !== [] ? $e->details : null,
                $e->statusCode,
            );
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error(
                'VALIDATION_FAILED',
                'The given data was invalid.',
                $e->errors(),
                422,
            );
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error('UNAUTHENTICATED', 'Authentication required.', null, 401);
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error('FORBIDDEN', $e->getMessage() ?: 'This action is unauthorized.', null, 403);
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error('NOT_FOUND', 'Resource not found.', null, 404);
        });

        $exceptions->render(function (TooManyRequestsHttpException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error('RATE_LIMITED', 'Too many requests. Please slow down.', null, 429);
        });

        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error('CSRF_MISMATCH', 'CSRF token mismatch.', null, 419);
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiResponse::error(
                'HTTP_ERROR',
                $e->getMessage() ?: 'Request failed.',
                null,
                $e->getStatusCode(),
            );
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            report($e);

            return ApiResponse::error('SERVER_ERROR', 'An unexpected error occurred.', null, 500);
        });
    })->create();
