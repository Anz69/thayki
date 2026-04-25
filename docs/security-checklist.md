# Security Checklist

## Secrets & environment

- [ ] `APP_KEY` generated (`php artisan key:generate`) and not committed.
- [ ] `APP_DEBUG=false` in production.
- [ ] `TELEGRAM_BOT_TOKEN` set from @BotFather, never committed.
- [ ] `TELEGRAM_ALLOW_UNSIGNED=false` in any non-local environment.
- [ ] `TELEGRAM_INIT_DATA_TTL` <= 24h.
- [ ] Database and Redis credentials scoped to least privilege.
- [ ] Payment wallet addresses loaded only from env, never from DB without review.

## Telegram authentication

- [ ] HMAC-SHA256 signature verification is enforced (see `InitDataValidator`).
- [ ] Replay protection backed by Redis `cache->add(...)` with the TTL equal to the `auth_date` window.
- [ ] `user.is_premium` / `photo_url` are accepted as read-only signals, never as RBAC signals.

## RBAC

- [ ] `role` middleware on all `/admin/*` endpoints.
- [ ] Sanctum tokens carry `role:<role>` ability and are re-issued on role changes (e.g. application approval).
- [ ] Policies/authorization checks for chat participation, meeting access, wallet access.

## Rate limiting

- [ ] `throttle:auth` on `/auth/telegram` — 5/min per IP (tune in `AppServiceProvider`).
- [ ] `throttle:api` applied globally to authenticated endpoints.
- [ ] `throttle:payments` / `throttle:withdrawals` / `throttle:messages` applied to their respective routes.

## Idempotency

- [ ] `Idempotency-Key` header enforced on: meetings.store, model-application.store, payments.store, payments.submit, withdrawals.store, photo uploads.
- [ ] `idempotency_keys` table garbage-collected with the configured TTL (`IDEMPOTENCY_TTL`).

## Transactions & concurrency

- [ ] Booking, payment confirmation and withdrawal all use `DB::transaction` + `lockForUpdate`.
- [ ] Wallet mutations flow through `WalletService` with optimistic locking (`version` column).
- [ ] Wallet transactions are idempotent per `(reference_type, reference_id, type)`.

## Payments

- [ ] `ManualPaymentGateway` is explicitly marked as a stub; real gateway must implement `PaymentGateway`.
- [ ] Confirmation is admin-only (`POST /admin/payments/{id}/confirm`) and audited.
- [ ] Commission stored in config, applied at credit time, with gross/net both recorded.
- [ ] Payment `tx_hash` uniqueness enforced at DB level (`payments.gateway+tx_hash`).

## Media uploads

- [ ] Upload size, MIME type and extension are validated in `FormRequest`.
- [ ] Files are stored on the `public` (or S3) disk under per-profile paths.
- [ ] `ProcessUploadedMediaJob` resizes and converts to WebP asynchronously.
- [ ] Direct file paths are not exposed; clients consume `attachment_url` or `ModelPhotoResource::url`.

## CORS

- [ ] `CORS_ALLOWED_ORIGINS` contains only the production web-app origin(s).
- [ ] Wildcard `*` must not be used in production.

## Logging & audit

- [ ] `AuditLogger` records auth logins/logouts, meeting transitions, payments, withdrawals, admin actions, roadmap changes.
- [ ] Laravel log channel forwards errors to a centralized platform (stderr for Docker, Sentry, etc.).
- [ ] `AuditLog.context` never includes secrets (tokens, bot tokens, raw initData).

## Data & backups

- [ ] MySQL backups scheduled with point-in-time recovery.
- [ ] Redis persistence configured (AOF or RDB) if used for replay protection.
- [ ] `audit_logs` retention policy defined.

## Infrastructure

- [ ] HTTPS enforced at the reverse proxy with HSTS.
- [ ] `TrustProxies` configured with the internal LB subnet.
- [ ] Queue workers + Reverb supervised (systemd / Horizon).
- [ ] Health check `/up` monitored.
