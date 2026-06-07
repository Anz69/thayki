<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LeadPaymentResource\Pages;
use App\Models\LeadPayment;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class LeadPaymentResource extends Resource
{
    protected static ?string $model = LeadPayment::class;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationGroup = 'Финансы';

    protected static ?string $navigationLabel = 'Заработок менеджеров';

    protected static ?string $modelLabel = 'Оплата';

    protected static ?string $pluralModelLabel = 'Заработок менеджеров';

    protected static ?int $navigationSort = 0;

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('confirmed_at', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('lead_id')->label('Заявка')->sortable(),
                Tables\Columns\TextColumn::make('manager.first_name')
                    ->label('Менеджер')
                    ->formatStateUsing(fn ($state, LeadPayment $r) => trim(($r->manager?->first_name ?? '').' '.($r->manager?->last_name ?? '')) ?: ($r->manager?->username ?? '—'))
                    ->searchable(),
                Tables\Columns\TextColumn::make('amount_minor')
                    ->label('Сумма')
                    ->formatStateUsing(fn ($state, LeadPayment $r) => number_format(($r->amount_minor ?? 0) / 100, 0, '.', ' ').' '.$r->currency)
                    ->sortable(),
                Tables\Columns\TextColumn::make('method')->label('Метод')->badge(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Статус')
                    ->badge()
                    ->color(fn (string $state) => $state === 'confirmed' ? 'success' : 'gray'),
                Tables\Columns\TextColumn::make('confirmed_at')->label('Подтверждён')->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')->options([
                    'confirmed' => 'Подтверждена',
                    'pending' => 'Ожидает',
                ]),
                Tables\Filters\SelectFilter::make('currency')->label('Валюта')->options([
                    'RUB' => 'RUB', 'USD' => 'USD', 'EUR' => 'EUR', 'THB' => 'THB',
                ]),
            ])
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLeadPayments::route('/'),
        ];
    }

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->with('manager');
    }
}
