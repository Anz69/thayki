<?php

declare(strict_types=1);

namespace App\Enums;

enum WalletTransactionType: string
{
    case CreditPayment = 'credit_payment';
    case DebitWithdraw = 'debit_withdraw';
    case Adjustment = 'adjustment';
}
