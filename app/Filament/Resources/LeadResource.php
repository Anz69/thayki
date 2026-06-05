<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Pages\SupportChats;
use App\Filament\Resources\LeadResource\Pages;
use App\Models\Lead;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class LeadResource extends Resource
{
    protected static ?string $model = Lead::class;

    protected static ?string $navigationIcon = 'heroicon-o-inbox-arrow-down';

    protected static ?string $navigationGroup = 'Заявки';

    protected static ?string $navigationLabel = 'Заявки на подбор';

    protected static ?string $modelLabel = 'Заявка';

    protected static ?string $pluralModelLabel = 'Заявки на подбор';

    protected static ?int $navigationSort = 1;

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::query()->where('status', 'new')->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable(),
                Tables\Columns\TextColumn::make('user.first_name')
                    ->label('Клиент')
                    ->formatStateUsing(fn ($state, Lead $r) => trim(($r->user?->first_name ?? '').' '.($r->user?->last_name ?? '')) ?: ($r->user?->username ?? '—'))
                    ->searchable(),
                Tables\Columns\TextColumn::make('city')->label('Город')->searchable(),
                Tables\Columns\TextColumn::make('modelProfile.display_name')
                    ->label('Выбранный типаж')
                    ->placeholder('— форма подбора'),
                Tables\Columns\TextColumn::make('hair_type')->label('Типаж')->toggleable()->placeholder('—'),
                Tables\Columns\TextColumn::make('age_range')->label('Возраст')->toggleable()->placeholder('—'),
                Tables\Columns\TextColumn::make('height_range')->label('Рост')->toggleable(isToggledHiddenByDefault: true)->placeholder('—'),
                Tables\Columns\TextColumn::make('goal')->label('Цель')->toggleable()->placeholder('—'),
                Tables\Columns\TextColumn::make('wishes')->label('Пожелания')->limit(40)->toggleable()->placeholder('—'),
                Tables\Columns\SelectColumn::make('status')
                    ->label('Статус')
                    ->options([
                        'new' => 'Новая',
                        'in_progress' => 'В работе',
                        'closed' => 'Закрыта',
                    ]),
                Tables\Columns\TextColumn::make('created_at')->label('Создана')
                    ->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Статус')
                    ->options([
                        'new' => 'Новая',
                        'in_progress' => 'В работе',
                        'closed' => 'Закрыта',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('openChat')
                    ->label('Открыть чат')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->visible(fn (Lead $r) => $r->chat_id !== null)
                    ->url(fn (Lead $r) => SupportChats::getUrl(['chat' => $r->chat_id])),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLeads::route('/'),
        ];
    }
}
