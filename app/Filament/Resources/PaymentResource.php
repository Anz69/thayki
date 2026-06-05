<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PaymentResource\Pages;
use App\Models\Payment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PaymentResource extends Resource
{
    protected static ?string $model = Payment::class;

    // Legacy payment flow — disabled in the lead-gen product.
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    protected static ?string $navigationGroup = 'Финансы';

    protected static ?string $navigationLabel = 'Платежи';

    protected static ?string $modelLabel = 'Платёж';

    protected static ?string $pluralModelLabel = 'Платежи';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('meeting_id')
                    ->label('Бронь')
                    ->relationship('meeting', 'id')
                    ->searchable()
                    ->required(),
                Forms\Components\Select::make('user_id')
                    ->label('Пользователь')
                    ->relationship('user', 'first_name')
                    ->searchable()
                    ->required(),
                Forms\Components\TextInput::make('gateway')
                    ->label('Шлюз')
                    ->required()
                    ->maxLength(32),
                Forms\Components\TextInput::make('method')
                    ->label('Метод')
                    ->required()
                    ->maxLength(16),
                Forms\Components\TextInput::make('amount_minor')
                    ->label('Сумма (в minor)')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('currency')
                    ->label('Валюта')
                    ->required()
                    ->maxLength(3),
                Forms\Components\TextInput::make('wallet_address')
                    ->label('Адрес кошелька')
                    ->maxLength(255),
                Forms\Components\TextInput::make('tx_hash')
                    ->label('Хэш транзакции')
                    ->maxLength(255),
                Forms\Components\TextInput::make('status')
                    ->label('Статус')
                    ->required()
                    ->maxLength(16)
                    ->default('pending'),
                Forms\Components\DateTimePicker::make('confirmed_at')->label('Подтверждён'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('meeting.id')->label('Бронь')
                    ->formatStateUsing(fn ($state) => $state ? "#{$state}" : '—')
                    ->url(fn (Payment $record): ?string => $record->meeting_id
                        ? MeetingResource::getUrl('edit', ['record' => $record->meeting_id])
                        : null)
                    ->sortable(),
                Tables\Columns\TextColumn::make('user.first_name')->label('Пользователь')
                    ->formatStateUsing(fn ($record) => trim("{$record->user?->first_name} {$record->user?->last_name}")
                        ?: ($record->user?->username ?? '—'))
                    ->url(fn (Payment $record): ?string => $record->user_id
                        ? (
                            $record->user?->role?->value === 'model'
                                ? ModelResource::getUrl('edit', ['record' => $record->user_id])
                                : UserResource::getUrl('edit', ['record' => $record->user_id])
                        )
                        : null),
                Tables\Columns\TextColumn::make('gateway')->label('Шлюз')->searchable(),
                Tables\Columns\TextColumn::make('method')->label('Метод')->searchable(),
                Tables\Columns\TextColumn::make('amount_minor')->label('Сумма')
                    ->formatStateUsing(fn ($state, $record) => number_format(((int) $state) / 100, 2)." {$record->currency}")
                    ->sortable(),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'confirmed',
                        'success' => 'paid',
                        'danger' => 'failed',
                    ]),
                Tables\Columns\TextColumn::make('confirmed_at')->label('Подтверждён')
                    ->dateTime('d.m.Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Создан')
                    ->dateTime('d.m.Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        'pending' => 'В ожидании',
                        'confirmed' => 'Подтверждён',
                        'paid' => 'Оплачен',
                        'failed' => 'Ошибка',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()->label('Удалить выбранные'),
                ])->label('Действия'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPayments::route('/'),
            'create' => Pages\CreatePayment::route('/create'),
            'edit' => Pages\EditPayment::route('/{record}/edit'),
        ];
    }
}
