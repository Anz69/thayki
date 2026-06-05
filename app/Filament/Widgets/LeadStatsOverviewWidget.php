<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\UserRole;
use App\Models\Lead;
use App\Models\ModelProfile;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

/**
 * Lead-gen overview: the headline number is NEW (unhandled) leads, plus
 * supporting figures for clients and the prototype catalog.
 */
class LeadStatsOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $newLeads = Lead::where('status', 'new')->count();
        $newLeadsToday = Lead::where('status', 'new')
            ->where('created_at', '>=', now()->startOfDay())
            ->count();
        $inProgress = Lead::where('status', 'in_progress')->count();
        $totalLeads = Lead::count();
        $closedLeads = Lead::where('status', 'closed')->count();

        $leadsToday = Lead::where('created_at', '>=', now()->startOfDay())->count();
        $leadsWeek = Lead::where('created_at', '>=', now()->subDays(6)->startOfDay())->count();

        $conversion = $totalLeads > 0 ? round($closedLeads / $totalLeads * 100) : 0;

        $withModel = Lead::whereNotNull('model_profile_id')->count();
        $fromForm = $totalLeads - $withModel;

        $totalClients = User::where('role', UserRole::Client)->count();
        $newClientsToday = User::where('role', UserRole::Client)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        $publishedModels = ModelProfile::where('is_published', true)->count();
        $totalModels = ModelProfile::count();

        $leadsSparkline = $this->dailyCounts(Lead::class, 'created_at', 7);

        return [
            Stat::make('Новые заявки', (string) $newLeads)
                ->description($newLeads > 0
                    ? "Требуют ответа · +{$newLeadsToday} сегодня"
                    : 'Все заявки обработаны')
                ->descriptionIcon($newLeads > 0 ? 'heroicon-m-inbox-arrow-down' : 'heroicon-m-check-circle')
                ->chart($leadsSparkline)
                ->color($newLeads > 0 ? 'danger' : 'success'),

            Stat::make('Заявок за неделю', number_format($leadsWeek))
                ->description("+{$leadsToday} сегодня")
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->chart($leadsSparkline)
                ->color('info'),

            Stat::make('В работе', (string) $inProgress)
                ->description('Взяты менеджером')
                ->descriptionIcon('heroicon-m-chat-bubble-left-right')
                ->color($inProgress > 0 ? 'warning' : 'gray'),

            Stat::make('Конверсия', "{$conversion}%")
                ->description("{$closedLeads} закрыто из {$totalLeads}")
                ->descriptionIcon('heroicon-m-check-badge')
                ->color('success'),

            Stat::make('Интерес к типажу', (string) $withModel)
                ->description("{$fromForm} через форму подбора")
                ->descriptionIcon('heroicon-m-sparkles')
                ->color('primary'),

            Stat::make('Клиентов', number_format($totalClients))
                ->description("+{$newClientsToday} сегодня")
                ->descriptionIcon('heroicon-m-users')
                ->color('info'),

            Stat::make('Модели в каталоге', (string) $publishedModels)
                ->description($publishedModels === $totalModels
                    ? 'Все опубликованы'
                    : "{$publishedModels} из {$totalModels} опубликованы")
                ->descriptionIcon('heroicon-m-rectangle-stack')
                ->color('warning'),
        ];
    }

    /**
     * Daily row counts for the given model/date column over the last N days.
     *
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $model
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
