<?php

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class UserResource extends Resource
{
    protected static ?string $model = User::class;
    protected static ?string $navigationIcon = 'heroicon-o-users';
    protected static ?string $navigationLabel = 'Пользователи';
    protected static ?string $modelLabel = 'Пользователь';
    protected static ?string $pluralModelLabel = 'Пользователи';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('first_name')->label('Имя')->required(),
            Forms\Components\TextInput::make('last_name')->label('Фамилия'),
            Forms\Components\TextInput::make('username')->label('Username'),
            Forms\Components\TextInput::make('telegram_id')->label('Telegram ID')->numeric()->required(),
            Forms\Components\Select::make('role')->label('Роль')
                ->options([
                    UserRole::Client->value => 'Клиент',
                    UserRole::Model->value  => 'Модель',
                    UserRole::Admin->value  => 'Администратор',
                ])->required(),
            Forms\Components\Select::make('status')->label('Статус')
                ->options([
                    UserStatus::Active->value => 'Активен',
                    UserStatus::Banned->value => 'Забанен',
                ])->required(),
            Forms\Components\Toggle::make('is_premium')->label('Premium'),
            Forms\Components\DateTimePicker::make('last_auth_at')->label('Последний вход'),
            Forms\Components\Section::make('Баланс')
                ->visibleOn('edit')
                ->schema([
                    Forms\Components\TextInput::make('wallet_balance_thb')
                        ->label('Баланс (THB)')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                    Forms\Components\TextInput::make('wallet_locked_thb')
                        ->label('Зарезервировано (THB)')
                        ->numeric()
                        ->minValue(0)
                        ->lte('wallet_balance_thb')
                        ->required(),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\ImageColumn::make('photo_url')->label('Фото')->circular(),
                Tables\Columns\TextColumn::make('first_name')->label('Имя')
                    ->formatStateUsing(fn ($record) => trim("{$record->first_name} {$record->last_name}"))
                    ->searchable(['first_name', 'last_name']),
                Tables\Columns\TextColumn::make('username')->label('@username')->searchable()
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—'),
                Tables\Columns\TextColumn::make('wallet.balance_minor')->label('Баланс')
                    ->state(fn (User $record) => (int) ($record->wallet?->balance_minor ?? 0))
                    ->formatStateUsing(fn ($state) => number_format(((int) $state) / 100, 2) . ' THB')
                    ->sortable(),
                Tables\Columns\TextColumn::make('wallet.available_minor')->label('Доступно')
                    ->state(fn (User $record) => (int) (($record->wallet?->balance_minor ?? 0) - ($record->wallet?->locked_minor ?? 0)))
                    ->formatStateUsing(fn ($state) => number_format(((int) $state) / 100, 2) . ' THB'),
                Tables\Columns\BadgeColumn::make('role')->label('Роль')
                    ->colors([
                        'warning' => UserRole::Client->value,
                        'success' => UserRole::Model->value,
                        'danger'  => UserRole::Admin->value,
                    ]),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'success' => UserStatus::Active->value,
                        'danger'  => UserStatus::Banned->value,
                    ]),
                Tables\Columns\IconColumn::make('is_premium')->label('Premium')->boolean(),
                Tables\Columns\TextColumn::make('last_auth_at')->label('Последний вход')
                    ->dateTime('d.m.Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Зарегистрирован')
                    ->dateTime('d.m.Y')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')->label('Роль')
                    ->options([
                        UserRole::Client->value => 'Клиент',
                        UserRole::Model->value  => 'Модель',
                        UserRole::Admin->value  => 'Администратор',
                    ]),
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        UserStatus::Active->value => 'Активен',
                        UserStatus::Banned->value => 'Забанен',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('ban')
                    ->label('Бан')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (User $r) => $r->status !== UserStatus::Banned)
                    ->action(fn (User $r) => $r->update(['status' => UserStatus::Banned])),
                Tables\Actions\Action::make('unban')
                    ->label('Разбан')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (User $r) => $r->status === UserStatus::Banned)
                    ->action(fn (User $r) => $r->update(['status' => UserStatus::Active])),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array { return []; }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('wallet');
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit'   => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
