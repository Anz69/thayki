<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\MeetingStatus;
use App\Enums\ModelApplicationStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Enums\WithdrawalStatus;
use App\Models\Meeting;
use App\Models\ModelApplication;
use App\Models\User;
use App\Models\Withdrawal;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class StatsOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $totalUsers     = User::count();
        $newUsersWeek   = User::where('created_at', '>=', now()->subWeek())->count();
        $newUsersToday  = User::where('created_at', '>=', now()->startOfDay())->count();

        $totalModels    = User::where('role', UserRole::Model)->count();
        $publishedModels = \App\Models\ModelProfile::where('is_published', true)->count();

        $activeMeetings = Meeting::whereIn('status', array_map(
            fn (MeetingStatus $s) => $s->value,
            MeetingStatus::openStatuses(),
        ))->count();

        $completedToday   = Meeting::where('status', MeetingStatus::Completed)
            ->where('completed_at', '>=', now()->startOfDay())
            ->count();

        $revenueMonth = (int) Meeting::where('status', MeetingStatus::Completed)
            ->where('completed_at', '>=', now()->startOfMonth())
            ->sum('price_thb');

        $revenueTotal = (int) Meeting::where('status', MeetingStatus::Completed)->sum('price_thb');

        $pendingWithdrawals       = Withdrawal::where('status', WithdrawalStatus::Pending)->count();
        $pendingWithdrawalsAmount = (int) round(
            Withdrawal::where('status', WithdrawalStatus::Pending)->sum('amount_minor') / 100
        );

        $pendingApplications = ModelApplication::where('status', ModelApplicationStatus::Submitted)->count();

        $openComplaints = \App\Models\Complaint::where('status', 'pending')->count();

        $usersSparkline = $this->dailyCounts(
            User::class,
            'created_at',
            7,
        );

        $meetingsSparkline = $this->dailyCounts(
            Meeting::class,
            'created_at',
            7,
        );

        return [
            Stat::make('Пользователей', number_format($totalUsers))
                ->description("+{$newUsersToday} сегодня · +{$newUsersWeek} за неделю")
                ->descriptionIcon('heroicon-m-users')
                ->chart($usersSparkline)
                ->color('info'),

            Stat::make('Моделей', "{$publishedModels} / {$totalModels}")
                ->description("{$publishedModels} опубликованы · {$totalModels} зарег.")
                ->descriptionIcon('heroicon-m-star')
                ->color('warning'),

            Stat::make('Активных встреч', $activeMeetings)
                ->description("{$completedToday} завершено сегодня")
                ->descriptionIcon('heroicon-m-calendar-days')
                ->chart($meetingsSparkline)
                ->color($activeMeetings > 0 ? 'success' : 'gray'),

            Stat::make('Выручка за месяц', number_format($revenueMonth) . ' ฿')
                ->description('Всего: ' . number_format($revenueTotal) . ' ฿')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('success'),

            Stat::make('Заявок на вывод', $pendingWithdrawals)
                ->description($pendingWithdrawals > 0
                    ? "На сумму {$pendingWithdrawalsAmount} ฿"
                    : 'Нет ожидающих')
                ->descriptionIcon($pendingWithdrawals > 0 ? 'heroicon-m-exclamation-circle' : 'heroicon-m-check-circle')
                ->color($pendingWithdrawals > 0 ? 'danger' : 'success'),

            Stat::make('Требуют внимания', $pendingApplications + $openComplaints)
                ->description("{$pendingApplications} заявок мод. · {$openComplaints} жалоб")
                ->descriptionIcon('heroicon-m-bell-alert')
                ->color(($pendingApplications + $openComplaints) > 0 ? 'warning' : 'success'),
        ];
    }

    /**
     * Returns daily counts for the given model and date column over the last N days.
     *
     * @return list<int>
     */
    private function dailyCounts(string $model, string $column, int $days): array
    {
        $rows = $model::selectRaw("DATE({$column}) as day, COUNT(*) as cnt")
            ->where($column, '>=', now()->subDays($days - 1)->startOfDay())
            ->groupBy('day')
            ->pluck('cnt', 'day');

        return collect(range($days - 1, 0))
            ->map(fn (int $i) => (int) ($rows[now()->subDays($i)->format('Y-m-d')] ?? 0))
            ->toArray();
    }
}
