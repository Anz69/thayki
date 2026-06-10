<?php

declare(strict_types=1);

namespace App\Enums;

enum LeadStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case AwaitingClient = 'awaiting_client';
    case AwaitingPayment = 'awaiting_payment';
    case Prepaid = 'prepaid';
    case Completed = 'completed';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Новая',
            self::InProgress => 'В работе',
            self::AwaitingClient => 'Ожидает ответа клиента',
            self::AwaitingPayment => 'Ожидает оплаты',
            self::Prepaid => 'Предоплачена',
            self::Completed => 'Выполнена',
            self::Closed => 'Закрыта',
        };
    }

    public static function managerSelectable(): array
    {
        return [
            self::InProgress,
            self::AwaitingClient,
            self::AwaitingPayment,
            self::Prepaid,
            self::Completed,
            self::Closed,
        ];
    }
}
