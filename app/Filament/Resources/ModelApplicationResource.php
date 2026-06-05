<?php

namespace App\Filament\Resources;

use App\Actions\ModelApplication\ApproveModelApplicationAction;
use App\Actions\ModelApplication\RejectModelApplicationAction;
use App\Enums\ModelApplicationStatus;
use App\Filament\Resources\ModelApplicationResource\Pages;
use App\Models\ModelApplication;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists;
use Filament\Infolists\Infolist;
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

    // Legacy "become a model" onboarding — not part of the lead-gen flow.
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-star';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $navigationLabel = 'Заявки моделей';

    protected static ?string $modelLabel = 'Заявка';

    protected static ?string $pluralModelLabel = 'Заявки моделей';

    protected static ?int $navigationSort = 3;

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
                        ?: ($record->user?->username ?? '—'))
                    ->url(fn (ModelApplication $record): ?string => $record->user_id
                        ? ($record->user?->role?->value === 'model'
                            ? ModelResource::getUrl('edit', ['record' => $record->user_id])
                            : UserResource::getUrl('edit', ['record' => $record->user_id]))
                        : null),
                Tables\Columns\TextColumn::make('user.username')->label('@username')
                    ->formatStateUsing(fn ($state) => $state ? "@{$state}" : '—')
                    ->url(fn ($record): ?string => $record->user?->username
                        ? "https://t.me/{$record->user->username}"
                        : null, true),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => ModelApplicationStatus::Submitted->value,
                        'gray' => ModelApplicationStatus::Draft->value,
                        'success' => ModelApplicationStatus::Approved->value,
                        'danger' => ModelApplicationStatus::Rejected->value,
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
                Tables\Actions\Action::make('view')
                    ->label('Просмотр')
                    ->icon('heroicon-o-eye')
                    ->color('gray')
                    ->modalHeading(function (ModelApplication $r): string {
                        $name = trim("{$r->user?->first_name} {$r->user?->last_name}") ?: ($r->user?->username ?? 'Пользователь');

                        return "Заявка #{$r->id} — {$name}";
                    })
                    ->modalDescription(function (ModelApplication $r): string {
                        $username = $r->user?->username ? '@'.$r->user->username : '—';
                        $status = $r->status instanceof ModelApplicationStatus ? $r->status->value : (string) $r->status;
                        $createdAt = $r->created_at?->format('d.m.Y H:i') ?? '—';

                        return "Статус: {$status} · Username: {$username} · Подана: {$createdAt}";
                    })
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Закрыть')
                    ->stickyModalHeader()
                    ->modalWidth('5xl')
                    ->modalContent(fn (ModelApplication $r) => view('filament.model-application-modal', ['record' => $r])),
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\Section::make('Анкета')->schema([
                Infolists\Components\TextEntry::make('payload.display_name')->label('Имя / псевдоним'),
                Infolists\Components\TextEntry::make('payload.age')->label('Возраст')->suffix(' лет'),
                Infolists\Components\TextEntry::make('payload.height_cm')->label('Рост')->suffix(' см'),
                Infolists\Components\TextEntry::make('payload.weight_kg')->label('Вес')->suffix(' кг'),
                Infolists\Components\TextEntry::make('payload.bust_size')->label('Бюст'),
                Infolists\Components\TextEntry::make('payload.butt_size')->label('Ягодицы'),
                Infolists\Components\TextEntry::make('payload.schedule')->label('График'),
                Infolists\Components\TextEntry::make('payload.hourly_rate_thb')->label('Ставка в час')->prefix('฿ '),
                Infolists\Components\TextEntry::make('payload.description')->label('О себе')->columnSpanFull(),
            ])->columns(2),
        ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListModelApplications::route('/'),
            'create' => Pages\CreateModelApplication::route('/create'),
            'edit' => Pages\EditModelApplication::route('/{record}/edit'),
        ];
    }
}
