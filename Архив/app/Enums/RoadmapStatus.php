<?php

declare(strict_types=1);

namespace App\Enums;

enum RoadmapStatus: string
{
    case Planned = 'planned';
    case InProgress = 'in_progress';
    case Done = 'done';
}
