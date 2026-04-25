<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Domain-level error that should be surfaced to the API client as a
 * 4xx business rule violation, not a 500 error.
 */
class DomainException extends ApiException
{
    public static function conflict(string $code, string $message): self
    {
        return new self($code, $message, 409);
    }

    public static function forbidden(string $code, string $message): self
    {
        return new self($code, $message, 403);
    }

    public static function invalid(string $code, string $message): self
    {
        return new self($code, $message, 422);
    }
}
