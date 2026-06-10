<?php

declare(strict_types=1);

return [

    'system_actor_user_id' => ($raw = env('WALLET_SYSTEM_ACTOR_USER_ID')) !== null && $raw !== ''
        ? max(1, (int) $raw)
        : null,

];
