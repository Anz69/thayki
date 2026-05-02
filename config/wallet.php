<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | System actor for automated wallet operations
    |--------------------------------------------------------------------------
    |
    | When a meeting is completed, payments are auto-confirmed in code. The
    | audit trail requires a User actor. If no admin user exists in the
    | database, set this to a dedicated system user id (e.g. a service account
    | created via seeder). Falls back to the first active admin when null.
    |
    */

    'system_actor_user_id' => ($raw = env('WALLET_SYSTEM_ACTOR_USER_ID')) !== null && $raw !== ''
        ? max(1, (int) $raw)
        : null,

];
