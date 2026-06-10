<?php

declare(strict_types=1);

namespace App\Exceptions;

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
