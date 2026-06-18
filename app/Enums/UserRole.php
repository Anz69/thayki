<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Model = 'model';
    case Manager = 'manager';
    case Admin = 'admin';
    case Requisite = 'requisite';

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    public function isRequisite(): bool
    {
        return $this === self::Requisite;
    }

    public function isManager(): bool
    {
        return $this === self::Manager;
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
