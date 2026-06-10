<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\PlatformEarningResource\Pages;
use App\Models\ModelProfile;
use App\Models\PlatformEarning;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Columns\Summarizers\Sum;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PlatformEarningResource extends Resource
{
    protected static ?string $model = PlatformEarning::class;

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationLabel = 'Доходы платформы';

    protected static ?string $navigationGroup = 'Финансы';

    protected static ?string $modelLabel = 'Доход';

    protected static ?string $pluralModelLabel = 'Доходы платформы';

    protected static ?int $navigationSort = 3;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('confirmed_at')
                    ->label('Дата')
                    ->dateTime('d.m.Y H:i')
                    ->sortable(),

                Tables\Columns\TextColumn::make('payment_id')
                    ->label('Платёж')
                    ->formatStateUsing(fn ($state) => $state ? "#{$state}" : '—')
                    ->url(fn (PlatformEarning $record): ?string => $record->payment_id
                        ? PaymentResource::getUrl('edit', ['record' => $record->payment_id])
                        : null)
                    ->sortable(),

                Tables\Columns\TextColumn::make('modelProfile.display_name')
                    ->label('Модель')
                    ->default('—')
                    ->searchable()
                    ->url(fn (PlatformEarning $record): ?string => $record->modelProfile?->user_id
                        ? ModelResource::getUrl('edit', ['record' => $record->modelProfile->user_id])
                        : null),

                Tables\Columns\TextColumn::make('gross_minor')
                    ->label('Брутто')
                    ->formatStateUsing(fn ($state) => self::money($state))
                    ->sortable()
                    ->summarize(Sum::make()
                        ->label('Σ Брутто')
                        ->formatStateUsing(fn ($state) => self::money((int) $state))),

                Tables\Columns\TextColumn::make('commission_rate')
                    ->label('Ставка')
                    ->formatStateUsing(fn ($state) => number_format(((float) $state) * 100, 2).' %')
                    ->sortable(),

                Tables\Columns\TextColumn::make('commission_minor')
                    ->label('Комиссия')
                    ->formatStateUsing(fn ($state) => self::money($state))
                    ->color('success')
                    ->weight('bold')
                    ->sortable()
                    ->summarize(Sum::make()
                        ->label('Σ Комиссия')
                        ->formatStateUsing(fn ($state) => self::money((int) $state))),

                Tables\Columns\TextColumn::make('net_minor')
                    ->label('Нетто (модели)')
                    ->formatStateUsing(fn ($state) => self::money($state))
                    ->color('gray')
                    ->sortable()
                    ->summarize(Sum::make()
                        ->label('Σ Нетто')
                        ->formatStateUsing(fn ($state) => self::money((int) $state))),

                Tables\Columns\BadgeColumn::make('source')
                    ->label('Источник')
                    ->colors([
                        'gray' => PlatformEarning::SOURCE_DEFAULT,
                        'warning' => PlatformEarning::SOURCE_MODEL_OVERRIDE,
                    ])
                    ->formatStateUsing(fn ($state) => match ($state) {
                        PlatformEarning::SOURCE_MODEL_OVERRIDE => 'Индив.',
                        default => 'Базовая',
                    }),
            ])
            ->filters([
                Filter::make('confirmed_at')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('С'),
                        Forms\Components\DatePicker::make('to')->label('По'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'] ?? null, fn ($q, $v) => $q->whereDate('confirmed_at', '>=', $v))
                            ->when($data['to'] ?? null, fn ($q, $v) => $q->whereDate('confirmed_at', '<=', $v));
                    })
                    ->indicateUsing(function (array $data): array {
                        $out = [];
                        if (! empty($data['from'])) {
                            $out[] = 'С '.$data['from'];
                        }
                        if (! empty($data['to'])) {
                            $out[] = 'По '.$data['to'];
                        }

                        return $out;
                    }),

                SelectFilter::make('model_profile_id')
                    ->label('Модель')
                    ->searchable()
                    ->options(fn (): array => ModelProfile::query()
                        ->orderBy('display_name')
                        ->pluck('display_name', 'id')
                        ->all()),

                SelectFilter::make('source')
                    ->label('Источник ставки')
                    ->options([
                        PlatformEarning::SOURCE_DEFAULT => 'Базовая',
                        PlatformEarning::SOURCE_MODEL_OVERRIDE => 'Индивидуальная',
                    ]),
            ])
            ->defaultSort('confirmed_at', 'desc');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlatformEarnings::route('/'),
        ];
    }

    private static function money(int|string|null $minor): string
    {
        $value = ((int) ($minor ?? 0)) / 100;

        return number_format($value, 2, '.', ' ').' ฿';
    }
}
