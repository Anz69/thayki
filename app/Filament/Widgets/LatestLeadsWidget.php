<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\LeadStatus;
use App\Filament\Pages\SupportChats;
use App\Models\Lead;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LatestLeadsWidget extends BaseWidget
{
    protected static ?string $heading = 'Последние заявки';

    protected static ?int $sort = 3;

    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Lead::query()
                    ->with(['user', 'modelProfile'])
                    ->latest()
                    ->limit(10),
            )
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->width('60px'),

                Tables\Columns\TextColumn::make('user.first_name')
                    ->label('Клиент')
                    ->formatStateUsing(fn ($state, Lead $r): string => trim(($r->user?->first_name ?? '').' '.($r->user?->last_name ?? '')) ?: '—')
                    ->description(fn (Lead $r): string => $r->user?->username ? '@'.$r->user->username : '—')
                    ->searchable(),

                Tables\Columns\TextColumn::make('city')
                    ->label('Город')
                    ->searchable()
                    ->placeholder('—'),

                Tables\Columns\TextColumn::make('modelProfile.display_name')
                    ->label('Интерес')
                    ->formatStateUsing(fn ($state): string => $state ? '✨ '.$state : 'Через форму')
                    ->color(fn ($state): string => $state ? 'primary' : 'gray'),

                Tables\Columns\TextColumn::make('goal')
                    ->label('Цель')
                    ->placeholder('—')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Статус')
                    ->badge()
                    ->formatStateUsing(fn (LeadStatus $state): string => match ($state) {
                        LeadStatus::New => 'Новая',
                        LeadStatus::InProgress => 'В работе',
                        LeadStatus::Closed => 'Закрыта',
                    })
                    ->color(fn (LeadStatus $state): string => match ($state) {
                        LeadStatus::New => 'danger',
                        LeadStatus::InProgress => 'warning',
                        LeadStatus::Closed => 'success',
                    }),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Создано')
                    ->since()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\Action::make('open')
                    ->label('Открыть чат')
                    ->icon('heroicon-m-chat-bubble-left-right')
                    ->visible(fn (Lead $r): bool => $r->chat_id !== null)
                    ->url(fn (Lead $r): string => SupportChats::getUrl(['chat' => $r->chat_id])),
            ])
            ->paginated(false)
            ->striped();
    }
}
