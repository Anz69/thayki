<?php

namespace App\Filament\Resources;

use App\Actions\ModelApplication\ApproveModelApplicationAction;
use App\Actions\ModelApplication\RejectModelApplicationAction;
use App\Enums\ModelApplicationStatus;
use App\Filament\Resources\ModelApplicationResource\Pages;
use App\Models\ModelApplication;
use App\Models\StartInvite;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ModelApplicationResource extends Resource
{
    protected static ?string $model = ModelApplication::class;
    protected static ?string $navigationIcon = 'heroicon-o-star';
    protected static ?string $navigationLabel = 'Заявки моделей';
    protected static ?string $modelLabel = 'Заявка';
    protected static ?string $pluralModelLabel = 'Заявки моделей';
    protected static ?int $navigationSort = 5;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('status')->label('Статус')
                ->options(collect(ModelApplicationStatus::cases())->mapWithKeys(fn ($c) => [$c->value => $c->value]))
                ->required(),
            Forms\Components\Textarea::make('admin_note')->label('Заметка'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\TextColumn::make('user.first_name')->label('Пользователь')
                    ->formatStateUsing(fn ($record) => "{$record->user?->first_name} {$record->user?->last_name}"),
                Tables\Columns\TextColumn::make('user.username')->label('@username')
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—'),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => ModelApplicationStatus::Submitted->value,
                        'gray'    => ModelApplicationStatus::Draft->value,
                        'success' => ModelApplicationStatus::Approved->value,
                        'danger'  => ModelApplicationStatus::Rejected->value,
                    ]),
                Tables\Columns\TextColumn::make('created_at')->label('Подана')->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options(collect(ModelApplicationStatus::cases())->mapWithKeys(fn ($c) => [$c->value => $c->value])),
            ])
            ->actions([
                Tables\Actions\Action::make('approve')
                    ->label('Одобрить')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (ModelApplication $r) => $r->status === ModelApplicationStatus::Submitted)
                    ->action(fn (ModelApplication $r) => app(ApproveModelApplicationAction::class)->execute($r)),
                Tables\Actions\Action::make('reject')
                    ->label('Отклонить')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (ModelApplication $r) => $r->status === ModelApplicationStatus::Submitted)
                    ->action(fn (ModelApplication $r) => app(RejectModelApplicationAction::class)->execute($r)),
                // Generates a deep-link invite for a *would-be model*: when
                // someone opens t.me/<bot>?start=<token>, StartHandler routes
                // them to the "become a model" mini-app screen so they can
                // submit an application.
                Tables\Actions\Action::make('issue_model_invite')
                    ->label('Сгенерировать ссылку для модели')
                    ->icon('heroicon-o-link')
                    ->color('warning')
                    ->action(function (): void {
                        $token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
                        StartInvite::query()->create([
                            'token' => $token,
                            'kind'  => StartInvite::KIND_MODEL,
                            'label' => 'Приглашение модели',
                            'created_by_admin_id' => auth()->id(),
                            'max_uses' => 1,
                        ]);
                        $bot = (string) config('telegram.bot_username', '');
                        $url = $bot ? "https://t.me/{$bot}?start={$token}" : '(укажите TELEGRAM_BOT_USERNAME)';
                        Notification::make()
                            ->title('Ссылка для модели создана')
                            ->body($url)
                            ->success()
                            ->persistent()
                            ->send();
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array { return []; }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListModelApplications::route('/'),
            'create' => Pages\CreateModelApplication::route('/create'),
            'edit'   => Pages\EditModelApplication::route('/{record}/edit'),
        ];
    }
}
