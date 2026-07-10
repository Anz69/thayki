<?php

declare(strict_types=1);

namespace App\Filament\Resources\StartInviteResource\RelationManagers;

use App\Models\User;
use App\Support\DisplayTimezone;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Carbon;

class UsersRelationManager extends RelationManager
{
    protected static string $relationship = 'users';

    protected static ?string $title = 'Пришедшие пользователи';

    protected static ?string $icon = 'heroicon-o-users';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('first_name')
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Имя')
                    ->state(function (User $record): string {
                        $name = trim(($record->first_name ?? '').' '.($record->last_name ?? ''));

                        return $name !== '' ? $name : ('@'.($record->username ?? '—'));
                    })
                    ->description(fn (User $record): ?string => $record->username ? '@'.$record->username : null)
                    ->searchable(['first_name', 'last_name', 'username']),
                Tables\Columns\TextColumn::make('telegram_id')->label('Telegram ID')->copyable()->toggleable(),
                Tables\Columns\TextColumn::make('leads_count')->counts('leads')->label('Заказов')
                    ->badge()->color('info')->sortable(),
                Tables\Columns\TextColumn::make('used_at')->label('Пришёл')
                    ->state(fn (User $record): string => DisplayTimezone::format(
                        $record->pivot?->used_at ? Carbon::parse($record->pivot->used_at) : null,
                    )),
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
