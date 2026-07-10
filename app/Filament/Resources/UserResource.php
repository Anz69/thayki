<?php

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Filament\Resources\UserResource\Pages;
use App\Models\StartInvite;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationLabel = 'Клиенты';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $modelLabel = 'Клиент';

    protected static ?string $pluralModelLabel = 'Клиенты';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('first_name')->label('Имя')->required(),
            Forms\Components\TextInput::make('last_name')->label('Фамилия'),
            Forms\Components\TextInput::make('username')->label('Username'),
            Forms\Components\TextInput::make('telegram_id')->label('Telegram ID')->numeric()
                ->required(fn (string $operation): bool => $operation === 'create'),
            Forms\Components\Select::make('role')->label('Роль')
                ->options([
                    UserRole::Client->value => 'Клиент',
                    UserRole::Manager->value => 'Менеджер',
                    UserRole::Requisite->value => 'Реквизиты',
                ])
                ->required(fn (string $operation): bool => $operation === 'create'),
            Forms\Components\Select::make('status')->label('Статус')
                ->options([
                    UserStatus::Active->value => 'Активен',
                    UserStatus::Banned->value => 'Забанен',
                ])->required(),
            Forms\Components\Toggle::make('is_strange')
                ->label('Strange (не верифицирован)')
                ->helperText('Пользователь видит только экран-заглушку, пока не пройдёт по invite-ссылке.'),
            Forms\Components\Toggle::make('notifications_enabled')->label('Уведомления в TG'),
            Forms\Components\Toggle::make('can_delete_messages')
                ->label('Может удалять сообщения')
                ->helperText('Разрешить этому менеджеру удалять сообщения в чатах заявок. По умолчанию выключено.')
                ->visible(fn (?User $record): bool => $record?->role === UserRole::Manager),
            Forms\Components\DateTimePicker::make('last_auth_at')->label('Последний вход'),
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
                    ->searchable(['first_name', 'last_name'])
                    ->url(fn (User $record): string => self::getUrl('edit', ['record' => $record])),
                Tables\Columns\TextColumn::make('username')->label('@username')->searchable()
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(fn (User $record): ?string => $record->username ? "https://t.me/{$record->username}" : null, true),
                Tables\Columns\BadgeColumn::make('role')->label('Роль')
                    ->colors([
                        'warning' => UserRole::Client->value,
                        'success' => UserRole::Model->value,
                        'danger' => UserRole::Admin->value,
                    ]),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'success' => UserStatus::Active->value,
                        'danger' => UserStatus::Banned->value,
                    ]),
                Tables\Columns\IconColumn::make('is_strange')->label('Strange')->boolean(),
                Tables\Columns\IconColumn::make('notifications_enabled')->label('TG-уведомления')->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('location')->label('Откуда')
                    ->getStateUsing(fn (User $record): string => trim(implode(', ', array_filter([$record->country, $record->city]))) ?: '—')
                    ->description(fn (User $record): ?string => $record->last_ip)
                    ->toggleable(),
                Tables\Columns\TextColumn::make('source_invite')->label('Пришёл по ссылке')
                    ->state(function (User $record): string {
                        $invite = $record->inviteUses->first()?->invite;
                        if ($invite === null) {
                            return '—';
                        }

                        return $invite->label ?: ('#'.$invite->id.' · '.$invite->token);
                    })
                    ->badge()
                    ->color(fn (User $record): string => $record->inviteUses->first() ? 'success' : 'gray')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('last_seen_at')->label('Был онлайн')
                    ->dateTime('d.m.Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Зарегистрирован')
                    ->dateTime('d.m.Y')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')->label('Роль')
                    ->options([
                        UserRole::Client->value => 'Клиент',
                        UserRole::Manager->value => 'Менеджер',
                        UserRole::Requisite->value => 'Реквизиты',
                    ]),
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        UserStatus::Active->value => 'Активен',
                        UserStatus::Banned->value => 'Забанен',
                    ]),
                Tables\Filters\TernaryFilter::make('is_strange')->label('Strange'),
            ])
            ->actions([
                Tables\Actions\Action::make('verify')
                    ->label('Верифицировать')
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->visible(fn (User $r) => (bool) $r->is_strange)
                    ->action(fn (User $r) => $r->update(['is_strange' => false])),
                Tables\Actions\Action::make('issue_verify_link')
                    ->label('Сгенерировать invite-ссылку')
                    ->icon('heroicon-o-link')
                    ->color('primary')
                    ->action(function (User $r): void {
                        $token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
                        StartInvite::query()->create([
                            'token' => $token,
                            'kind' => StartInvite::KIND_VERIFY,
                            'label' => "Для пользователя #{$r->id}",
                            'created_by_admin_id' => auth()->id(),
                            'max_uses' => 1,
                        ]);
                        $miniAppUrl = (string) config('telegram.miniapp_url', '');
                        $bot = (string) config('telegram.bot_username', '');
                        if ($miniAppUrl !== '' && str_starts_with($miniAppUrl, 'https://t.me/')) {
                            $sep = str_contains($miniAppUrl, '?') ? '&' : '?';
                            $url = rtrim($miniAppUrl, '/').$sep.'startapp='.$token;
                        } elseif ($bot) {
                            $url = "https://t.me/{$bot}?start={$token}";
                        } else {
                            $url = '(укажите TELEGRAM_MINIAPP_URL или TELEGRAM_BOT_USERNAME)';
                        }
                        Notification::make()
                            ->title('Invite-ссылка создана')
                            ->body($url)
                            ->success()
                            ->persistent()
                            ->send();
                    }),
                Tables\Actions\Action::make('mark_strange')
                    ->label('Сделать strange')
                    ->icon('heroicon-o-question-mark-circle')
                    ->color('warning')
                    ->visible(fn (User $r) => ! $r->is_strange)
                    ->requiresConfirmation()
                    ->action(fn (User $r) => $r->update(['is_strange' => true])),
                Tables\Actions\Action::make('ban')
                    ->label('Бан')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Заблокировать пользователя?')
                    ->modalDescription('Все активные сессии будут завершены. Пользователь не сможет пользоваться приложением.')
                    ->modalSubmitActionLabel('Заблокировать')
                    ->visible(fn (User $r) => $r->status !== UserStatus::Banned)
                    ->action(function (User $r): void {
                        try {
                            $r->status = UserStatus::Banned;
                            $r->save();

                            try {
                                $r->tokens()->delete();
                            } catch (\Throwable) {
                            }

                            Notification::make()
                                ->title('Пользователь заблокирован')
                                ->body('Сессии прекращены, токены отозваны.')
                                ->success()
                                ->send();
                        } catch (\Throwable $e) {
                            Notification::make()
                                ->title('Не удалось заблокировать')
                                ->body($e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
                Tables\Actions\Action::make('unban')
                    ->label('Разбан')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (User $r) => $r->status === UserStatus::Banned)
                    ->action(function (User $r): void {
                        $r->status = UserStatus::Active;
                        $r->save();
                        Notification::make()->title('Пользователь разблокирован')->success()->send();
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->modifyQueryUsing(fn ($query) => $query->where('role', UserRole::Client->value))
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        // Eager-load the invite source so the "Пришёл по ссылке" column doesn't N+1.
        return parent::getEloquentQuery()->with('inviteUses.invite');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
