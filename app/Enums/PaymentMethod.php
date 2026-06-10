<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentMethod: string
{
    case Usdt = 'usdt';
    case Btc = 'btc';
    case Ton = 'ton';
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::Usdt => 'USDT',
            self::Btc => 'BTC',
            self::Ton => 'TON',
            self::Manual => 'Manual',
        };
    }

    public static function withdrawalDefaults(): array
    {
        return [self::Usdt, self::Btc, self::Ton];
    }
}
