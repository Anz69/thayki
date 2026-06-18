<?php

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Filament\Resources\RequisitesResource\Pages;
use App\Models\User;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class RequisitesResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    protected static ?string $navigationLabel = 'Реквизиты';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $modelLabel = 'Реквизиты';

    protected static ?string $pluralModelLabel = 'Реквизиты';

    protected static ?int $navigationSort = 1;

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
                    ->label('Снять реквизиты')
                    ->icon('heroicon-o-user-minus')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Снять роль «Реквизиты»?')
                    ->modalDescription('Пользователь станет обычным клиентом.')
                    ->action(function (User $r): void {
                        $r->update(['role' => UserRole::Client->value]);
                        Notification::make()->title('Роль снята')->body('Пользователь переведён в клиенты.')->success()->send();
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
                        Notification::make()->title('Заблокирован')->success()->send();
                    }),
                Tables\Actions\Action::make('unban')
                    ->label('Разбан')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (User $r) => $r->status === UserStatus::Banned)
                    ->action(function (User $r): void {
                        $r->status = UserStatus::Active;
                        $r->save();
                        Notification::make()->title('Разблокирован')->success()->send();
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->modifyQueryUsing(fn ($query) => $query->where('role', UserRole::Requisite->value))
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRequisites::route('/'),
            'create' => Pages\CreateRequisite::route('/create'),
            'edit' => Pages\EditRequisite::route('/{record}/edit'),
        ];
    }
}
