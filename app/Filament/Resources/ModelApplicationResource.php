<?php

namespace App\Filament\Resources;

use App\Actions\ModelApplication\ApproveModelApplicationAction;
use App\Actions\ModelApplication\RejectModelApplicationAction;
use App\Enums\ModelApplicationStatus;
use App\Filament\Resources\ModelApplicationResource\Pages;
use App\Models\ModelApplication;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

/**
 * Заявки кандидатов на роль модели. Создание invite-ссылок для будущих
 * моделей живёт в отдельном разделе «Invite-ссылки» — здесь чисто
 * рассмотрение уже поданных заявок (approve / reject).
 */
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
                    ->formatStateUsing(fn ($record) => trim("{$record->user?->first_name} {$record->user?->last_name}")
                        ?: ($record->user?->username ?? '—')),
                Tables\Columns\TextColumn::make('user.username')->label('@username')
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(fn ($record): ?string => $record->user?->username
                        ? "https://t.me/{$record->user->username}"
                        : null, true),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => ModelApplicationStatus::Submitted->value,
                        'gray'    => ModelApplicationStatus::Draft->value,
                        'success' => ModelApplicationStatus::Approved->value,
                        'danger'  => ModelApplicationStatus::Rejected->value,
                    ]),
                Tables\Columns\TextColumn::make('created_at')->label('Подана')
                    ->dateTime('d.m.Y H:i')->sortable(),
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
