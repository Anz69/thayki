<?php

declare(strict_types=1);

namespace App\Enums;

enum ChatParticipantRole: string
{
    case Client = 'client';
    case Model = 'model';
    case Support = 'support';
    case Admin = 'admin';
    case Requisites = 'requisites';
}
