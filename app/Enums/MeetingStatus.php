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

    /** @return list<self> */
    public static function openStatuses(): array
    {
        return [self::Pending, self::Accepted, self::Paid, self::Confirmed];
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Rejected, self::Expired, self::Completed, self::Cancelled], true);
    }
}
