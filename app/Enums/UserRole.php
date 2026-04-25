<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Model = 'model';
    case Admin = 'admin';

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    public function isModel(): bool
    {
        return $this === self::Model;
    }

    public function isClient(): bool
    {
        return $this === self::Client;
    }
}
