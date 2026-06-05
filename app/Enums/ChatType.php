<?php

declare(strict_types=1);

namespace App\Enums;

enum ChatType: string
{
    case Meeting = 'meeting';
    case Support = 'support';
    case Lead = 'lead';
}
