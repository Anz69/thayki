<?php

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Filament\Resources\ModelResource\Pages;
use App\Models\StartInvite;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ModelResource extends Resource
{
    protected static ?string $model = User::class;
    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    protected static ?string $navigationLabel = 'Модели';
    protected static ?string $modelLabel = 'Модель';
    protected static ?string $pluralModelLabel = 'Модели';
    protected static ?int $navigationSort = 2;
    protected static ?string $slug = 'models';

    public static function form(Form $form): Form
    {
        $onlyCreate = fn (string $operation): bool => $operation === 'create';

        return $form->schema([
            Forms\Components\Section::make('Учётная запись')
                ->schema([
                    Forms\Components\TextInput::make('first_name')->label('Имя')->required(),
                    Forms\Components\TextInput::make('last_name')->label('Фамилия'),
                    Forms\Components\TextInput::make('username')->label('Username'),
                    Forms\Components\TextInput::make('telegram_id')->label('Telegram ID')->numeric()
                        ->required($onlyCreate),
                    Forms\Components\Select::make('status')->label('Статус')
                        ->options([
                            UserStatus::Active->value => 'Активен',
                            UserStatus::Banned->value => 'Забанен',
                        ])->required(),
                    Forms\Components\Toggle::make('is_strange')
                        ->label('Strange (не верифицирован)')
                        ->helperText('Пользователь видит только экран-заглушку, пока не пройдёт по invite-ссылке.'),
                    Forms\Components\Toggle::make('notifications_enabled')->label('Уведомления в TG'),
                ])
                ->columns(2),

            Forms\Components\Section::make('Профиль модели')
                ->relationship('modelProfile')
                ->schema([
                    Forms\Components\TextInput::make('display_name')->label('Отображаемое имя')
                        ->required($onlyCreate)->maxLength(255),
                    Forms\Components\TextInput::make('age')->label('Возраст')->numeric()
                        ->required($onlyCreate),
                    Forms\Components\TextInput::make('height_cm')->label('Рост (см)')->numeric()
                        ->required($onlyCreate),
                    Forms\Components\TextInput::make('weight_kg')->label('Вес (кг)')->numeric()
                        ->required($onlyCreate),
                    Forms\Components\TextInput::make('bust_size')->label('Грудь')
                        ->required($onlyCreate)->maxLength(16),
                    Forms\Components\TextInput::make('butt_size')->label('Бёдра')
                        ->required($onlyCreate)->maxLength(16),
                    Forms\Components\Textarea::make('description')->label('Описание')->columnSpanFull(),
                    Forms\Components\Select::make('schedule')
                        ->label('Расписание')
                        ->options([
                            'any'   => 'Любое время',
                            'day'   => 'День (07:00–20:00)',
                            'night' => 'Ночь (20:00–07:00)',
                        ])
                        ->required($onlyCreate)
                        ->default('any'),
                    Forms\Components\TextInput::make('hourly_rate_thb')->label('Цена за час (฿)')->numeric()
                        ->required($onlyCreate),
                    Forms\Components\Toggle::make('is_published')->label('Опубликована'),
                    Forms\Components\Toggle::make('is_verified')->label('Верифицирована'),
                    Forms\Components\DateTimePicker::make('published_at')->label('Дата публикации'),
                ])
                ->columns(2),

            Forms\Components\Section::make('Кошелёк')
                ->relationship('wallet')
                ->schema([
                    Forms\Components\TextInput::make('balance_minor')
                        ->label('Баланс (minor)')
                        ->numeric()
                        ->minValue(0)
                        ->helperText('Текущий баланс в минимальных единицах валюты'),
                    Forms\Components\TextInput::make('locked_minor')
                        ->label('Заблокировано (minor)')
                        ->numeric()
                        ->minValue(0)
                        ->helperText('Удержано под активные встречи')
                        ->disabled(),
                ])
                ->columns(2)
                ->visibleOn('edit'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => $query->where('role', UserRole::Model->value)->with('modelProfile'))
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\ImageColumn::make('photo_url')->label('Фото')->circular(),
                Tables\Columns\TextColumn::make('first_name')->label('Имя')
                    ->formatStateUsing(fn ($record) => trim("{$record->first_name} {$record->last_name}"))
                    ->searchable(['first_name', 'last_name']),
                Tables\Columns\TextColumn::make('username')->label('@username')->searchable()
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(fn (User $record): ?string => $record->username ? "https://t.me/{$record->username}" : null, true),
                Tables\Columns\TextColumn::make('modelProfile.display_name')
                    ->label('Профиль')
                    ->searchable()
                    ->default('—'),
                Tables\Columns\TextColumn::make('modelProfile.hourly_rate_thb')
                    ->label('Цена/ч')
                    ->formatStateUsing(fn ($state) => $state ? '฿ '.number_format((int) $state) : '—')
                    ->sortable(),
                Tables\Columns\IconColumn::make('modelProfile.is_published')->label('Опубл.')->boolean(),
                Tables\Columns\IconColumn::make('modelProfile.is_verified')->label('Верифиц.')->boolean(),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'success' => UserStatus::Active->value,
                        'danger'  => UserStatus::Banned->value,
                    ]),
                Tables\Columns\IconColumn::make('is_strange')->label('Strange')->boolean(),
                Tables\Columns\TextColumn::make('last_auth_at')->label('Последний вход')
                    ->dateTime('d.m.Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        UserStatus::Active->value => 'Активен',
                        UserStatus::Banned->value => 'Забанен',
                    ]),
                Tables\Filters\TernaryFilter::make('is_strange')->label('Strange'),
                Tables\Filters\TernaryFilter::make('modelProfile.is_published')->label('Опубликована'),
                Tables\Filters\TernaryFilter::make('modelProfile.is_verified')->label('Верифицирована'),
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
                            'kind'  => StartInvite::KIND_VERIFY,
                            'label' => "Для модели #{$r->id}",
                            'created_by_admin_id' => auth()->id(),
                            'max_uses' => 1,
                        ]);
                        $miniAppUrl = (string) config('telegram.miniapp_url', '');
                        $bot        = (string) config('telegram.bot_username', '');
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
                Tables\Actions\Action::make('publish_profile')
                    ->label('Опубликовать')
                    ->icon('heroicon-o-eye')
                    ->color('success')
                    ->visible(fn (User $r) => $r->modelProfile !== null && ! $r->modelProfile->is_published)
                    ->action(function (User $r): void {
                        $r->modelProfile->update([
                            'is_published' => true,
                            'published_at' => now(),
                        ]);
                        Notification::make()->title('Профиль опубликован')->success()->send();
                    }),
                Tables\Actions\Action::make('unpublish_profile')
                    ->label('Снять с публикации')
                    ->icon('heroicon-o-eye-slash')
                    ->color('warning')
                    ->visible(fn (User $r) => $r->modelProfile?->is_published)
                    ->action(function (User $r): void {
                        $r->modelProfile->update(['is_published' => false]);
                        Notification::make()->title('Профиль снят с публикации')->warning()->send();
                    }),
                Tables\Actions\Action::make('verify_profile')
                    ->label('Верифицировать профиль')
                    ->icon('heroicon-o-shield-check')
                    ->color('success')
                    ->visible(fn (User $r) => $r->modelProfile !== null && ! $r->modelProfile->is_verified)
                    ->action(function (User $r): void {
                        $r->modelProfile->update(['is_verified' => true]);
                        Notification::make()->title('Профиль верифицирован')->success()->send();
                    }),
                Tables\Actions\Action::make('ban')
                    ->label('Бан')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Заблокировать модель?')
                    ->modalDescription('Все активные сессии будут завершены. Пользователь не сможет пользоваться приложением.')
                    ->modalSubmitActionLabel('Заблокировать')
                    ->visible(fn (User $r) => $r->status !== UserStatus::Banned)
                    ->action(function (User $r): void {
                        try {
                            $r->status = UserStatus::Banned;
                            $r->save();
                            try { $r->tokens()->delete(); } catch (\Throwable) {}
                            Notification::make()->title('Модель заблокирована')->body('Сессии прекращены, токены отозваны.')->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title('Не удалось заблокировать')->body($e->getMessage())->danger()->send();
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
                        Notification::make()->title('Модель разблокирована')->success()->send();
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array { return []; }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListModels::route('/'),
            'create' => Pages\CreateModel::route('/create'),
            'edit'   => Pages\EditModel::route('/{record}/edit'),
        ];
    }
}
