# Telegram Mini App — Laravel Backend

Production-ready Laravel 12 / PHP 8.2+ backend for a Telegram Mini App with:

- Telegram `initData` authentication (HMAC-SHA256 + replay protection)
- Sanctum bearer tokens scoped to user role (`client`, `model`, `admin`)
- Domain model: models catalog, bookings (meetings), payments (stubbed gateway, pluggable), wallets, withdrawals, chat + support chat, model applications, roadmap, audit
- Real-time updates via Laravel Reverb (WebSockets)
- Idempotency, rate limiting, transactions with row-level locks, audit logging
- Pest 3 test suite (unit + feature)

## Requirements

- PHP 8.2+
- Composer 2
- MySQL 8 (production) or SQLite (dev/tests)
- Redis 7 (cache/queue/session/broadcast)
- Node.js only needed if you also run Reverb via Sail

## Installation

```bash
cp .env.example .env
php artisan key:generate
composer install

# For production switch DB_CONNECTION=mysql and fill credentials in .env
php artisan migrate --seed
```

## Running

```bash
# HTTP API
php artisan serve

# Queue worker (media processing, expire meeting jobs, etc.)
php artisan queue:work

# WebSockets (chat, meeting status notifications)
php artisan reverb:start
```

## Tests

```bash
vendor\bin\pest
# or
php artisan test
```

Tests run on an in-memory SQLite database and use synthetic Telegram `initData`
fixtures. See `tests/Helpers/TelegramInitData.php`.

## Static analysis and formatting

```bash
vendor\bin\pint                       # code style (PSR-12)
vendor\bin\phpstan analyse --memory-limit=-1   # Larastan
```

## Project structure

```
app/
  Actions/            # Use-case classes (the only place with business logic)
  Enums/              # Status, role, method enums
  Events/             # Broadcast events (MeetingStatusChanged, MessageSent)
  Exceptions/         # Domain exceptions -> JSON via ApiResponse::error
  Http/
    Controllers/Api/V1/     # Thin controllers (orchestration only)
    Middleware/             # ForceJsonResponse, EnsureRole, IdempotencyKey...
    Requests/               # FormRequests for validation
    Resources/              # JsonResource shapes
  Jobs/               # Queued jobs (ExpirePendingMeetingJob, ProcessUploadedMediaJob)
  Models/             # Eloquent models
  Services/           # Domain services (Telegram, Payments, Wallet, Audit, Catalog)
  Support/ApiResponse.php    # Canonical response envelope
routes/api.php         # /api/v1/* routes
routes/channels.php    # Broadcasting authorization
database/migrations/   # 2026_04_20_* schema
database/factories/    # Test factories
tests/                 # Pest tests
```

## Endpoints overview

See `docs/api.md` for the full endpoint reference including request bodies,
responses and auth requirements.

## Security

See `docs/security-checklist.md` for the mandatory pre-production checklist
(secrets, rate limits, CORS, replay protection, RBAC, audit, payment
confirmation workflow, etc.).

## Payments

Payments are intentionally **stubbed** via `ManualPaymentGateway`. The client
receives a wallet address and submits a `tx_hash`; an admin confirms the
payment via `POST /api/v1/admin/payments/{id}/confirm`. See
`app/Services/Payments/Contracts/PaymentGateway.php` for the interface you
need to implement to integrate a real provider (USDT/BTC/TON or fiat). The
gateway is resolved from `config/payments.php::gateways[]`.
