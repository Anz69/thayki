<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\Lead;
use App\Models\StartInvite;
use App\Models\StartInviteUse;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class InviteStatsOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $totalInvites = StartInvite::count();
        $activeInvites = StartInvite::whereColumn('times_used', '<', 'max_uses')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->count();

        $userIds = StartInviteUse::query()->select('user_id')->distinct();
        $came = (clone $userIds)->count('user_id');

        $orders = Lead::query()->whereIn('user_id', $userIds)->count();
        $buyers = User::query()->whereIn('id', $userIds)->has('leads')->count();
        $conversion = $came > 0 ? (int) round($buyers / $came * 100) : 0;
        $ordersPerUser = $came > 0 ? round($orders / $came, 1) : 0;

        return [
            Stat::make('Всего ссылок', (string) $totalInvites)
                ->description("Активных: {$activeInvites}")
                ->color('gray'),
            Stat::make('Пришло людей', (string) $came)
                ->description('Уникальных по всем ссылкам')
                ->color('info'),
            Stat::make('Заказов от них', (string) $orders)
                ->description("В среднем {$ordersPerUser} на человека")
                ->color('success'),
            Stat::make('Конверсия', $conversion.'%')
                ->description("{$buyers} из {$came} создали заказ")
                ->color($conversion >= 50 ? 'success' : ($conversion > 0 ? 'warning' : 'gray')),
        ];
    }
}
