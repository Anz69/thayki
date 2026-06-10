<?php

declare(strict_types=1);

namespace App\Exceptions;

class InvalidInitDataException extends ApiException
{
    public static function signature(): self
    {
        return new self('INIT_DATA_INVALID', 'Telegram initData signature is invalid.', 401);
    }

    public static function expired(): self
    {
        return new self('INIT_DATA_EXPIRED', 'Telegram initData is expired.', 401);
    }

    public static function malformed(string $message = 'Telegram initData is malformed.', array $details = []): self
    {
        return new self('INIT_DATA_INVALID', $message, 422, $details);
    }

    public static function replay(): self
    {
        return new self('INIT_DATA_REPLAY', 'Telegram initData has already been used.', 409);
    }
}
