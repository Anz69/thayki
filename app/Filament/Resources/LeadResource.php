<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\LeadStatus;
use App\Filament\Pages\SupportChats;
use App\Filament\Resources\LeadResource\Pages;
use App\Models\Lead;
use Filament\Infolists;
use Filament\Infolists\Infolist;
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
                Tables\Columns\TextColumn::make('vip')
                    ->label('VIP')
                    ->state(fn (Lead $r): ?string => $r->isVip() ? 'VIP' : null)
                    ->badge()
                    ->color('danger')
                    ->icon('heroicon-s-sparkles')
                    ->placeholder('—'),
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
                    ->options(collect(LeadStatus::cases())->mapWithKeys(fn (LeadStatus $s) => [$s->value => $s->label()])->all()),
                Tables\Columns\TextColumn::make('created_at')->label('Создана')
                    ->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Статус')
                    ->options(collect(LeadStatus::cases())->mapWithKeys(fn (LeadStatus $s) => [$s->value => $s->label()])->all()),
                Tables\Filters\Filter::make('vip')
                    ->label('Только VIP')
                    ->query(fn ($query) => $query->where('goal', Lead::VIP_GOAL)),
            ])
            ->actions([
                Tables\Actions\Action::make('view')
                    ->label('Просмотр')
                    ->icon('heroicon-o-eye')
                    ->color('gray')
                    ->modalHeading(fn (Lead $r): string => 'Заявка #'.$r->id)
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Закрыть')
                    ->infolist(fn (Infolist $infolist): Infolist => static::leadInfolist($infolist)),
                Tables\Actions\Action::make('openChat')
                    ->label('Открыть чат')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->visible(fn (Lead $r) => $r->chat_id !== null)
                    ->url(fn (Lead $r) => SupportChats::getUrl(['chat' => $r->chat_id])),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function leadInfolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\TextEntry::make('vip')
                ->hiddenLabel()
                ->state(fn (Lead $r): ?string => $r->isVip() ? 'V.I.P заявка' : null)
                ->badge()
                ->color('danger')
                ->icon('heroicon-s-sparkles')
                ->visible(fn (Lead $r): bool => $r->isVip()),

            Infolists\Components\Section::make('Клиент')
                ->icon('heroicon-o-user')
                ->schema([
                    Infolists\Components\TextEntry::make('user.first_name')
                        ->label('Имя')
                        ->formatStateUsing(fn ($state, Lead $r): string => trim(($r->user?->first_name ?? '').' '.($r->user?->last_name ?? '')) ?: '—'),
                    Infolists\Components\TextEntry::make('user.username')
                        ->label('Username')
                        ->formatStateUsing(fn ($state): string => $state ? '@'.$state : '—'),
                ])
                ->columns(2),

            Infolists\Components\Section::make('Интересует типаж')
                ->icon('heroicon-o-sparkles')
                ->visible(fn (Lead $r): bool => $r->modelProfile !== null)
                ->schema([
                    Infolists\Components\ImageEntry::make('model_photo')
                        ->label('')
                        ->disk('public')
                        ->height(160)
                        ->state(function (Lead $r): ?string {
                            $p = $r->modelProfile?->photos()->where('is_main', true)->first()
                                ?? $r->modelProfile?->photos()->orderBy('position')->first();

                            return $p?->path;
                        }),
                    Infolists\Components\TextEntry::make('modelProfile.display_name')->label('Модель'),
                    Infolists\Components\TextEntry::make('modelProfile.age')->label('Возраст')->suffix(' лет')->placeholder('—'),
                    Infolists\Components\TextEntry::make('modelProfile.height_cm')->label('Рост')->suffix(' см')->placeholder('—'),
                ])
                ->columns(2),

            Infolists\Components\Section::make('Параметры подбора')
                ->icon('heroicon-o-adjustments-horizontal')
                ->visible(fn (Lead $r): bool => $r->modelProfile === null)
                ->schema([
                    Infolists\Components\TextEntry::make('hair_type')->label('Типаж')->placeholder('—'),
                    Infolists\Components\TextEntry::make('age_range')->label('Возраст')->placeholder('—'),
                    Infolists\Components\TextEntry::make('height_range')->label('Рост')->placeholder('—'),
                    Infolists\Components\TextEntry::make('goal')->label('Цель')->placeholder('—'),
                ])
                ->columns(2),

            Infolists\Components\Section::make('Заявка')
                ->icon('heroicon-o-inbox-arrow-down')
                ->schema([
                    Infolists\Components\TextEntry::make('city')->label('Город')->placeholder('—'),
                    Infolists\Components\TextEntry::make('status')
                        ->label('Статус')
                        ->badge()
                        ->formatStateUsing(fn (LeadStatus $state): string => $state->label())
                        ->color(fn (LeadStatus $state): string => match ($state) {
                            LeadStatus::New => 'danger',
                            LeadStatus::InProgress, LeadStatus::AwaitingClient, LeadStatus::AwaitingPayment => 'warning',
                            LeadStatus::Prepaid, LeadStatus::Completed => 'success',
                            LeadStatus::Closed => 'gray',
                        }),
                    Infolists\Components\TextEntry::make('wishes')
                        ->label('Пожелания')
                        ->placeholder('—')
                        ->columnSpanFull(),
                    Infolists\Components\TextEntry::make('created_at')
                        ->label('Создана')
                        ->dateTime('d.m.Y H:i'),
                ])
                ->columns(2),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLeads::route('/'),
        ];
    }
}
