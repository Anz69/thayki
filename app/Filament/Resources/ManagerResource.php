<?php

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Filament\Resources\ManagerResource\Pages;
use App\Models\User;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ManagerResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-briefcase';

    protected static ?string $navigationLabel = 'Менеджеры';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $modelLabel = 'Менеджер';

    protected static ?string $pluralModelLabel = 'Менеджеры';

    protected static ?int $navigationSort = 0;

    public static function form(Form $form): Form
    {

        return UserResource::form($form);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\ImageColumn::make('photo_url')->label('Фото')->circular(),
                Tables\Columns\TextColumn::make('first_name')->label('Имя')
                    ->formatStateUsing(fn ($record) => trim("{$record->first_name} {$record->last_name}"))
                    ->searchable(['first_name', 'last_name'])
                    ->url(fn (User $record): string => self::getUrl('edit', ['record' => $record])),
                Tables\Columns\TextColumn::make('username')->label('@username')->searchable()
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(fn (User $record): ?string => $record->username ? "https://t.me/{$record->username}" : null, true),
                Tables\Columns\TextColumn::make('phone_number')->label('Телефон')
                    ->formatStateUsing(fn ($state) => $state ?: '—')->toggleable(),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'success' => UserStatus::Active->value,
                        'danger' => UserStatus::Banned->value,
                    ]),
                Tables\Columns\IconColumn::make('notifications_enabled')->label('TG-уведомления')->boolean(),
                Tables\Columns\TextColumn::make('last_seen_at')->label('Был онлайн')
                    ->dateTime('d.m.Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Назначен')
                    ->dateTime('d.m.Y')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        UserStatus::Active->value => 'Активен',
                        UserStatus::Banned->value => 'Забанен',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('demote')
                    ->label('Снять менеджера')
                    ->icon('heroicon-o-user-minus')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Снять роль менеджера?')
                    ->modalDescription('Пользователь станет обычным клиентом и потеряет доступ к панели менеджера.')
                    ->action(function (User $r): void {
                        $r->update(['role' => UserRole::Client->value]);
                        Notification::make()->title('Менеджер снят')->body('Пользователь переведён в клиенты.')->success()->send();
                    }),
                Tables\Actions\Action::make('ban')
                    ->label('Бан')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (User $r) => $r->status !== UserStatus::Banned)
                    ->action(function (User $r): void {
                        $r->status = UserStatus::Banned;
                        $r->save();
                        try { $r->tokens()->delete(); } catch (\Throwable) {}
                        Notification::make()->title('Менеджер заблокирован')->success()->send();
                    }),
                Tables\Actions\Action::make('unban')
                    ->label('Разбан')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (User $r) => $r->status === UserStatus::Banned)
                    ->action(function (User $r): void {
                        $r->status = UserStatus::Active;
                        $r->save();
                        Notification::make()->title('Менеджер разблокирован')->success()->send();
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->modifyQueryUsing(fn ($query) => $query->where('role', UserRole::Manager->value))
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListManagers::route('/'),
            'create' => Pages\CreateManager::route('/create'),
            'edit' => Pages\EditManager::route('/{record}/edit'),
        ];
    }
}
