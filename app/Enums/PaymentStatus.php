<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Submitted = 'submitted';
    case Confirmed = 'confirmed';
    case Failed = 'failed';
    case Refunded = 'refunded';
}
