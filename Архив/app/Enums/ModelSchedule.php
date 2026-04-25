<?php

declare(strict_types=1);

namespace App\Enums;

enum ModelSchedule: string
{
    case Day = 'day';
    case Night = 'night';
    case Any = 'any';
}
