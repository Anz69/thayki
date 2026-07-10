<?php

declare(strict_types=1);

namespace App\Filament\Resources\StartInviteResource\RelationManagers;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class LeadsRelationManager extends RelationManager
{
    protected static string $relationship = 'leads';

    protected static ?string $title = 'Заказы по ссылке';

    protected static ?string $icon = 'heroicon-o-shopping-bag';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->defaultSort('leads.created_at', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('№')->sortable(),
                Tables\Columns\TextColumn::make('client')->label('Клиент')
                    ->state(function (Lead $record): string {
                        $u = $record->user;
                        $name = trim(($u?->first_name ?? '').' '.($u?->last_name ?? ''));

                        return $name !== '' ? $name : ('@'.($u?->username ?? '—'));
                    })
                    ->description(fn (Lead $record): ?string => $record->user?->username ? '@'.$record->user->username : null),
                Tables\Columns\TextColumn::make('city')->label('Город')->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->label('Статус')->badge()
                    ->formatStateUsing(fn (LeadStatus $state): string => $state->label())
                    ->color(fn (LeadStatus $state): string => match ($state) {
                        LeadStatus::Completed, LeadStatus::Prepaid => 'success',
                        LeadStatus::Closed => 'gray',
                        LeadStatus::New => 'info',
                        default => 'warning',
                    }),
                Tables\Columns\TextColumn::make('created_at')->label('Создан')
                    ->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->headerActions([])
            ->actions([])
            ->bulkActions([]);
    }

    public function isReadOnly(): bool
    {
        return true;
    }
}
