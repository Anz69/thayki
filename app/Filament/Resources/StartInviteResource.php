<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StartInviteResource\Pages;
use App\Models\StartInvite;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class StartInviteResource extends Resource
{
    protected static ?string $model = StartInvite::class;

    protected static ?string $navigationIcon = 'heroicon-o-link';

    protected static ?string $navigationGroup = 'Система';

    protected static ?string $navigationLabel = 'Invite-ссылки';

    protected static ?string $modelLabel = 'Invite';

    protected static ?string $pluralModelLabel = 'Invite-ссылки';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('kind')->label('Тип')->required()
                ->options([
                    StartInvite::KIND_VERIFY => 'Verify (обычный пользователь)',
                    StartInvite::KIND_MODEL => 'Model (заявка на модель)',
                ])
                ->default(StartInvite::KIND_VERIFY),
            Forms\Components\TextInput::make('label')->label('Название (для админа)')
                ->maxLength(255)
                ->placeholder('напр. "Промо ноябрь"'),
            Forms\Components\TextInput::make('max_uses')->label('Кол-во активаций')
                ->numeric()->minValue(1)->default(1),
            Forms\Components\DateTimePicker::make('expires_at')->label('Действует до')
                ->helperText('Оставьте пустым, чтобы не было срока'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\BadgeColumn::make('kind')->label('Тип')
                    ->colors([
                        'success' => StartInvite::KIND_VERIFY,
                        'warning' => StartInvite::KIND_MODEL,
                    ]),
                Tables\Columns\TextColumn::make('label')->label('Название')->limit(40),
                Tables\Columns\TextColumn::make('token')->label('Токен')->copyable()->limit(20),
                Tables\Columns\TextColumn::make('link')->label('Ссылка')
                    ->state(function (StartInvite $record): string {
                        $bot = (string) config('telegram.bot_username', '');
                        if ($bot === '') {
                            return '— укажите TELEGRAM_BOT_USERNAME —';
                        }

                        return "https://t.me/{$bot}?start={$record->token}";
                    })
                    ->copyable()
                    ->copyMessage('Ссылка скопирована')
                    ->limit(60),
                Tables\Columns\TextColumn::make('uses_label')->label('Использовано')
                    ->state(fn (StartInvite $record): string => "{$record->times_used}/{$record->max_uses}"),
                Tables\Columns\TextColumn::make('expires_at')->label('До')
                    ->dateTime('d.m.Y H:i')
                    ->placeholder('бессрочно'),
                Tables\Columns\TextColumn::make('created_at')->label('Создана')
                    ->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('kind')->label('Тип')
                    ->options([
                        StartInvite::KIND_VERIFY => 'Verify',
                        StartInvite::KIND_MODEL => 'Model',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('copy_link')
                    ->label('Скопировать')
                    ->icon('heroicon-o-clipboard-document')
                    ->action(function (StartInvite $record): void {
                        $bot = (string) config('telegram.bot_username', '');
                        $url = $bot ? "https://t.me/{$bot}?start={$record->token}" : '';
                        Notification::make()
                            ->title('Ссылка')
                            ->body($url ?: 'Укажите TELEGRAM_BOT_USERNAME в .env')
                            ->success()
                            ->send();
                    }),
                Tables\Actions\DeleteAction::make()->label('Удалить'),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStartInvites::route('/'),
            'create' => Pages\CreateStartInvite::route('/create'),
            'edit' => Pages\EditStartInvite::route('/{record}/edit'),
        ];
    }
}
