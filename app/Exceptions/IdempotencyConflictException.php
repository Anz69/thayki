<?php

declare(strict_types=1);

namespace App\Exceptions;

class IdempotencyConflictException extends ApiException
{
    public function __construct()
    {
        parent::__construct(
            'IDEMPOTENCY_CONFLICT',
            'The provided Idempotency-Key was reused with a different request body.',
            409,
        );
    }
}
