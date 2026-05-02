<?php

namespace App\Filament\Resources;

use App\Actions\Chat\EnsureSupportChatAction;
use App\Actions\Wallet\ProcessWithdrawalAction;
use App\Enums\WithdrawalStatus;
use App\Filament\Pages\SupportChats;
use App\Filament\Resources\WithdrawalResource\Pages;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class WithdrawalResource extends Resource
{
    protected static ?string $model = Withdrawal::class;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationGroup = 'Финансы';

    protected static ?string $navigationLabel = 'Выводы';

    protected static ?string $modelLabel = 'Вывод';

    protected static ?string $pluralModelLabel = 'Выводы';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('status')->label('Статус')
                ->options(collect(WithdrawalStatus::cases())->mapWithKeys(fn ($c) => [$c->value => $c->value]))
                ->required(),
            Forms\Components\Textarea::make('admin_note')->label('Заметка администратора'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\TextColumn::make('user.first_name')->label('Модель')
                    ->formatStateUsing(fn ($record) => trim("{$record->user?->first_name} {$record->user?->last_name}")
                        ?: ($record->user?->username ?? '—'))
                    ->url(fn (Withdrawal $record): ?string => $record->user_id
                        ? ModelResource::getUrl('edit', ['record' => $record->user_id])
                        : null),
                Tables\Columns\TextColumn::make('user.username')->label('Telegram')
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(
                        fn (Withdrawal $record): ?string => $record->user?->username
                            ? "https://t.me/{$record->user->username}"
                            : null,
                        true,
                    )
                    ->color('primary'),
                Tables\Columns\TextColumn::make('user_balance')->label('Баланс модели')
                    ->state(function (Withdrawal $record): string {
                        $wallet = $record->user
                            ? Wallet::query()->where('user_id', $record->user->id)->first()
                            : null;
                        $balanceMinor = (int) ($wallet?->balance_minor ?? 0);

                        return number_format($balanceMinor / 100, 2).' '.($wallet?->currency ?? 'THB');
                    }),
                Tables\Columns\TextColumn::make('amount_minor')->label('К выводу')
                    ->formatStateUsing(fn ($state, $record) => number_format($state / 100, 2)." {$record->currency}")
                    ->sortable(),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => WithdrawalStatus::Pending->value,
                        'success' => WithdrawalStatus::Paid->value,
                        'primary' => WithdrawalStatus::Approved->value,
                        'danger' => WithdrawalStatus::Rejected->value,
                    ]),
                Tables\Columns\TextColumn::make('created_at')->label('Создан')->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options(collect(WithdrawalStatus::cases())->mapWithKeys(fn ($c) => [$c->value => $c->value])),
            ])
            ->actions([
                Tables\Actions\Action::make('contact_via_support')
                    ->label('Написать в чате')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->color('warning')
                    ->action(function (Withdrawal $record): void {
                        if ($record->user === null) {
                            Notification::make()->title('У заявки нет пользователя.')->danger()->send();

                            return;
                        }
                        try {
                            $chat = app(EnsureSupportChatAction::class)->execute($record->user);
                            session()->put('support_chat_preselect', $chat->id);
                            redirect(SupportChats::getUrl(['chat' => $chat->id]));
                        } catch (\Throwable $e) {
                            Notification::make()->title('Ошибка: '.$e->getMessage())->danger()->send();
                        }
                    }),

                Tables\Actions\Action::make('approve')
                    ->label('Одобрить')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Withdrawal $r) => $r->status === WithdrawalStatus::Pending)
                    ->action(function (Withdrawal $r): void {
                        $admin = auth()->user();
                        try {
                            app(ProcessWithdrawalAction::class)->approve($r, $admin);
                            Notification::make()->title('Вывод одобрен')->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title('Ошибка: '.$e->getMessage())->danger()->send();
                        }
                    }),
                Tables\Actions\Action::make('mark_paid')
                    ->label('Оплачено')
                    ->icon('heroicon-o-banknotes')
                    ->color('primary')
                    ->requiresConfirmation()
                    ->visible(fn (Withdrawal $r) => $r->status === WithdrawalStatus::Approved)
                    ->action(function (Withdrawal $r): void {
                        $admin = auth()->user();
                        try {
                            app(ProcessWithdrawalAction::class)->markPaid($r, $admin);
                            Notification::make()->title('Вывод отмечен как оплаченный')->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title('Ошибка: '.$e->getMessage())->danger()->send();
                        }
                    }),
                Tables\Actions\Action::make('reject')
                    ->label('Отклонить')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->form([
                        Forms\Components\Textarea::make('note')->label('Причина отклонения'),
                    ])
                    ->requiresConfirmation()
                    ->visible(fn (Withdrawal $r) => in_array($r->status, [WithdrawalStatus::Pending, WithdrawalStatus::Approved], true))
                    ->action(function (Withdrawal $r, array $data): void {
                        $admin = auth()->user();
                        try {
                            app(ProcessWithdrawalAction::class)->reject($r, $admin, $data['note'] ?? null);
                            Notification::make()->title('Вывод отклонён, средства возвращены')->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title('Ошибка: '.$e->getMessage())->danger()->send();
                        }
                    }),
                Tables\Actions\EditAction::make()->label('Изменить'),
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
            'index' => Pages\ListWithdrawals::route('/'),
            'create' => Pages\CreateWithdrawal::route('/create'),
            'edit' => Pages\EditWithdrawal::route('/{record}/edit'),
        ];
    }
}
