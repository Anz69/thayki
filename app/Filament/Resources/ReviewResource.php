<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReviewResource\Pages;
use App\Models\Complaint;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ReviewResource extends Resource
{
    protected static ?string $model = Complaint::class;

    // Legacy post-meeting reviews — disabled in the lead-gen product.
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-star';

    protected static ?string $navigationGroup = 'Обратная связь';

    protected static ?string $navigationLabel = 'Отзывы';

    protected static ?string $modelLabel = 'Отзыв';

    protected static ?string $pluralModelLabel = 'Отзывы';

    protected static ?int $navigationSort = 2;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->where('subject', 'Отзыв');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\TextColumn::make('user.first_name')->label('Пользователь')
                    ->formatStateUsing(fn ($record) => trim("{$record->user?->first_name} {$record->user?->last_name}")
                        ?: ($record->user?->username ?? '—'))
                    ->url(fn (Complaint $record): ?string => $record->user_id
                        ? UserResource::getUrl('edit', ['record' => $record->user_id])
                        : null),
                Tables\Columns\TextColumn::make('meeting_id')->label('Бронь')
                    ->formatStateUsing(fn ($state) => $state ? "#{$state}" : '—')
                    ->url(fn (Complaint $record): ?string => $record->meeting_id
                        ? MeetingResource::getUrl('edit', ['record' => $record->meeting_id])
                        : null),
                Tables\Columns\TextColumn::make('body')->label('Отзыв')->limit(120),
                Tables\Columns\TextColumn::make('created_at')->label('Дата')->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Tables\Actions\Action::make('open_meeting')
                    ->label('Открыть бронь')
                    ->icon('heroicon-o-calendar-days')
                    ->visible(fn (Complaint $record): bool => (int) ($record->meeting_id ?? 0) > 0)
                    ->url(fn (Complaint $record): ?string => $record->meeting_id
                        ? MeetingResource::getUrl('edit', ['record' => $record->meeting_id])
                        : null),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReviews::route('/'),
        ];
    }
}
