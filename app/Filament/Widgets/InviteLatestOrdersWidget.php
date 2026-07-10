<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\StartInviteUse;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class InviteLatestOrdersWidget extends BaseWidget
{
    protected static ?string $heading = 'Заказы от пришедших по ссылкам';

    protected static ?int $sort = 4;

    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Lead::query()
                    ->whereIn('user_id', StartInviteUse::query()->select('user_id'))
                    ->with(['user.inviteUses.invite'])
                    ->latest(),
            )
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->width('56px'),
                Tables\Columns\TextColumn::make('user.first_name')->label('Клиент')
                    ->formatStateUsing(fn ($state, Lead $r): string => trim(($r->user?->first_name ?? '').' '.($r->user?->last_name ?? '')) ?: ('@'.($r->user?->username ?? '—')))
                    ->description(fn (Lead $r): ?string => $r->user?->username ? '@'.$r->user->username : null),
                Tables\Columns\TextColumn::make('source')->label('Ссылка')->badge()->color('success')
                    ->state(function (Lead $r): string {
                        $invite = $r->user?->inviteUses->first()?->invite;
                        if ($invite === null) {
                            return '—';
                        }

                        return $invite->label ?: ('#'.$invite->id);
                    }),
                Tables\Columns\TextColumn::make('city')->label('Город')->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->label('Статус')->badge()
                    ->formatStateUsing(fn (LeadStatus $state): string => $state->label())
                    ->color(fn (LeadStatus $state): string => match ($state) {
                        LeadStatus::New => 'danger',
                        LeadStatus::Prepaid, LeadStatus::Completed => 'success',
                        LeadStatus::Closed => 'gray',
                        default => 'warning',
                    }),
                Tables\Columns\TextColumn::make('created_at')->label('Создан')->since()->sortable(),
            ])
            ->paginated([25, 50, 100])
            ->defaultPaginationPageOption(25)
            ->striped();
    }
}
