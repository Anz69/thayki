# API Reference (v1)

All endpoints are prefixed with `/api/v1`. Responses follow a canonical envelope:

Success:

```json
{ "ok": true, "data": ..., "meta": { "pagination": {...} } }
```

Error:

```json
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "...", "details": {...} } }
```

Common error codes: `VALIDATION_FAILED` (422), `UNAUTHENTICATED` (401),
`FORBIDDEN` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), `INIT_DATA_INVALID`,
`INIT_DATA_EXPIRED`, `INIT_DATA_REPLAY`, `SLOT_TAKEN`, `PAYMENT_INVALID_STATE`,
`INSUFFICIENT_FUNDS`, `WALLET_CONFLICT`.

Auth: all protected endpoints require `Authorization: Bearer <token>` where
`<token>` is the Sanctum plain-text token issued by `POST /auth/telegram`.

Idempotency: mutating endpoints marked (I) support an `Idempotency-Key`
request header. Duplicate submissions within the TTL return the cached
response.

## Auth

| Method | Path                  | Auth | Notes                                                                        |
| ------ | --------------------- | ---- | ---------------------------------------------------------------------------- |
| POST   | `/auth/telegram`      | —    | Body: `{init_data}`. Returns `{token, user, role}`. Rate-limited (`auth`).   |
| GET    | `/auth/me`            | yes  | Returns current user + role + wallet status.                                 |
| POST   | `/auth/logout`        | yes  | Revokes current token.                                                       |

## Catalog (public)

| Method | Path                        | Notes                                                    |
| ------ | --------------------------- | -------------------------------------------------------- |
| GET    | `/catalog/models`           | Filters: `schedule`, `min_price`, `max_price`, `min_age`, `max_age`, `q`, `sort`, `per_page`, `page`. |
| GET    | `/catalog/models/{id}`      | Single model profile.                                    |

## Me / Profile

| Method | Path                                                | Notes |
| ------ | --------------------------------------------------- | ----- |
| GET    | `/me`                                               | Current user. |
| PATCH  | `/me`                                               | Update `first_name`, `last_name`, `language_code`. |
| GET    | `/me/model-profile`                                 | Model's own profile. |
| PATCH  | `/me/model-profile`                                 | Update model profile. |
| POST   | `/me/model-profile/photos` (I)                      | Upload photo (`multipart/form-data`: `photo`, `is_main`). |
| DELETE | `/me/model-profile/photos/{photoId}`                | Delete photo. |
| POST   | `/me/model-profile/photos/{photoId}/main`           | Set as main photo. |

## Model Application ("Become a model")

| Method | Path                      | Notes |
| ------ | ------------------------- | ----- |
| GET    | `/model-application`      | Current application status. |
| POST   | `/model-application` (I)  | Submit new application. |

## Meetings (bookings)

| Method | Path                                 | Notes |
| ------ | ------------------------------------ | ----- |
| GET    | `/meetings`                          | List with filters: `status`, pagination. |
| POST   | `/meetings` (I)                      | Body: `{model_profile_id, scheduled_at, duration_hours}`. |
| GET    | `/meetings/{meeting}`                | Show single. |
| POST   | `/meetings/{meeting}/accept`         | Model accepts. |
| POST   | `/meetings/{meeting}/reject`         | Model rejects. |
| POST   | `/meetings/{meeting}/cancel`         | Any participant cancels. |
| POST   | `/meetings/{meeting}/confirm`        | Model confirms after payment. |
| POST   | `/meetings/{meeting}/complete`       | Any participant marks completed. |

State machine: `pending → accepted | rejected | expired | cancelled`,
`accepted → paid | cancelled | expired`, `paid → confirmed | cancelled`,
`confirmed → completed | cancelled`.

## Payments

All under `throttle:payments` (60/min per user).

| Method | Path                                | Notes |
| ------ | ----------------------------------- | ----- |
| POST   | `/payments` (I)                     | Body: `{meeting_id, method}`. Returns payment + `intent`. |
| GET    | `/payments/{payment}`               | Show single. |
| POST   | `/payments/{payment}/submit` (I)    | Body: `{tx_hash}`. |

## Chats

| Method | Path                                         | Notes |
| ------ | -------------------------------------------- | ----- |
| GET    | `/chats`                                     | List chats where user is a participant. |
| GET    | `/chats/support`                             | Lazy-creates a support chat. |
| GET    | `/chats/meetings/{meeting}`                  | Lazy-creates a chat for a meeting. |
| GET    | `/chats/{chat}/messages`                     | Cursor pagination: `limit` (default 30), `before_id`. |
| POST   | `/chats/{chat}/messages`                     | Body: `{body?, attachment?}`. Throttled `messages` (120/min). |
| POST   | `/chats/{chat}/read`                         | Update `last_read_at` marker. |

## Wallet & Withdrawals

| Method | Path                      | Notes |
| ------ | ------------------------- | ----- |
| GET    | `/wallet`                 | Wallet (balance + locked + version). |
| GET    | `/wallet/transactions`    | Paginated history. |
| GET    | `/withdrawals`            | Current user's withdrawals. |
| POST   | `/withdrawals` (I)        | Body: `{amount_minor, method, wallet_address}`. Throttled `withdrawals`. |

## Roadmap

| Method | Path          | Notes |
| ------ | ------------- | ----- |
| GET    | `/roadmap`    | Public list. |

## Admin (role=admin)

| Method | Path                                                  |
| ------ | ----------------------------------------------------- |
| GET    | `/admin/model-applications`                           |
| POST   | `/admin/model-applications/{application}/approve`     |
| POST   | `/admin/model-applications/{application}/reject`      |
| GET    | `/admin/payments`                                     |
| POST   | `/admin/payments/{payment}/confirm`                   |
| GET    | `/admin/withdrawals`                                  |
| POST   | `/admin/withdrawals/{withdrawal}/approve`             |
| POST   | `/admin/withdrawals/{withdrawal}/mark-paid`           |
| POST   | `/admin/withdrawals/{withdrawal}/reject`              |
| POST   | `/admin/roadmap`                                      |
| PATCH  | `/admin/roadmap/{item}`                               |
| DELETE | `/admin/roadmap/{item}`                               |
| GET    | `/admin/audit`                                        |

## Real-time channels (Reverb)

- `private-users.{id}` — user-level notifications
- `private-chats.{id}` — participants of a chat (+ admins)
- `private-model-profiles.{id}` — the model owner (+ admins)

Events:

- `meeting.status_changed` — `{meeting_id, status, previous_status}`
- `message.sent` — `{id, chat_id, sender_id, body, created_at}`

## Telegram `initData` authorization (algorithm)

1. Client Mini App sends `POST /api/v1/auth/telegram` with `init_data` = the raw query string from `window.Telegram.WebApp.initData`.
2. Server parses pairs, extracts `hash`, sorts remaining pairs lexicographically, joins as `key=value\n...` → `data_check_string`.
3. `secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)` (raw bytes).
4. `expected = HMAC_SHA256(secret_key, data_check_string)`.
5. `hash_equals(expected, received_hash)` – otherwise → `401 INIT_DATA_INVALID`.
6. `auth_date` freshness: reject if older than `TELEGRAM_INIT_DATA_TTL` (default 24h) → `401 INIT_DATA_EXPIRED`.
7. Replay protection: the full `hash` is stored in cache for the TTL; a second use → `409 INIT_DATA_REPLAY`.
8. User is upserted by `telegram_id`, wallet record is ensured, Sanctum token issued with ability `role:<client|model|admin>`.
