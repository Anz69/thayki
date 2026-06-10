<?php

declare(strict_types=1);

namespace App\Enums;

enum MeetingStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Expired = 'expired';
    case Paid = 'paid';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public static function openStatuses(): array
    {
        return [self::Pending, self::Accepted, self::Paid, self::Confirmed];
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending   => 'Ожидание',
            self::Accepted  => 'Принята',
            self::Rejected  => 'Отклонена',
            self::Expired   => 'Истекла',
            self::Paid      => 'Оплачена',
            self::Confirmed => 'Подтверждена',
            self::Completed => 'Завершена',
            self::Cancelled => 'Отменена',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Rejected, self::Expired, self::Completed, self::Cancelled], true);
    }
}
