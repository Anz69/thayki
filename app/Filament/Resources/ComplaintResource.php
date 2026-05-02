<?php

namespace App\Filament\Resources;

use App\Filament\Pages\SupportChats;
use App\Filament\Resources\ComplaintResource\Pages;
use App\Models\Complaint;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ComplaintResource extends Resource
{
    protected static ?string $model = Complaint::class;

    protected static ?string $navigationIcon = 'heroicon-o-exclamation-triangle';

    protected static ?string $navigationGroup = 'Обратная связь';

    protected static ?string $navigationLabel = 'Жалобы';

    protected static ?string $modelLabel = 'Жалоба';

    protected static ?string $pluralModelLabel = 'Жалобы';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('subject')->label('Тема')->disabled(),
            Forms\Components\Textarea::make('body')->label('Текст жалобы')->disabled()->rows(6),
            Forms\Components\Select::make('status')->label('Статус')->required()
                ->options([
                    Complaint::STATUS_PENDING => 'В ожидании',
                    Complaint::STATUS_RESOLVED => 'Решено',
                    Complaint::STATUS_DISMISSED => 'Отклонено',
                ]),
            Forms\Components\Textarea::make('admin_note')->label('Заметка'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\TextColumn::make('user.first_name')->label('От пользователя')
                    ->formatStateUsing(fn ($record) => trim("{$record->user?->first_name} {$record->user?->last_name}")
                        ?: ($record->user?->username ?? '—'))
                    ->url(fn (Complaint $record): ?string => $record->user_id
                        ? UserResource::getUrl('edit', ['record' => $record->user_id])
                        : null),
                Tables\Columns\TextColumn::make('meeting_id')->label('Бронь')
                    ->formatStateUsing(fn ($state) => $state ? "#{$state}" : '—')
                    ->url(fn (Complaint $record): ?string => $record->meeting_id
                        ? MeetingResource::getUrl('edit', ['record' => $record->meeting_id])
                        : null),
                Tables\Columns\TextColumn::make('subject')->label('Тема')->limit(40),
                Tables\Columns\TextColumn::make('body')->label('Текст')->limit(80),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->colors([
                        'warning' => Complaint::STATUS_PENDING,
                        'success' => Complaint::STATUS_RESOLVED,
                        'gray' => Complaint::STATUS_DISMISSED,
                    ]),
                Tables\Columns\TextColumn::make('created_at')->label('Создана')->dateTime('d.m.Y H:i')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options([
                        Complaint::STATUS_PENDING => 'В ожидании',
                        Complaint::STATUS_RESOLVED => 'Решено',
                        Complaint::STATUS_DISMISSED => 'Отклонено',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('resolve')->label('Решить')
                    ->icon('heroicon-o-check')->color('success')
                    ->visible(fn (Complaint $r) => $r->status === Complaint::STATUS_PENDING)
                    ->action(function (Complaint $r): void {
                        $r->update([
                            'status' => Complaint::STATUS_RESOLVED,
                            'resolved_at' => now(),
                            'resolved_by_admin_id' => auth()->id(),
                        ]);
                        Notification::make()->title('Жалоба решена')->success()->send();
                    }),
                Tables\Actions\Action::make('dismiss')->label('Отклонить')
                    ->icon('heroicon-o-x-mark')->color('gray')
                    ->visible(fn (Complaint $r) => $r->status === Complaint::STATUS_PENDING)
                    ->action(function (Complaint $r): void {
                        $r->update([
                            'status' => Complaint::STATUS_DISMISSED,
                            'resolved_at' => now(),
                            'resolved_by_admin_id' => auth()->id(),
                        ]);
                        Notification::make()->title('Жалоба отклонена')->success()->send();
                    }),
                Tables\Actions\EditAction::make()->label('Открыть'),
                Tables\Actions\Action::make('open_support_chat')
                    ->label('Открыть чат')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->color('info')
                    ->visible(fn (Complaint $record): bool => $record->user_id !== null)
                    ->url(fn (Complaint $record): string => SupportChats::getUrl().'?user='.$record->user_id
                    ),
                Tables\Actions\Action::make('open_meeting')
                    ->label('Открыть бронь')
                    ->icon('heroicon-o-calendar-days')
                    ->visible(fn (Complaint $record): bool => (int) ($record->meeting_id ?? 0) > 0)
                    ->url(fn (Complaint $record): ?string => $record->meeting_id
                        ? MeetingResource::getUrl('edit', ['record' => $record->meeting_id])
                        : null),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->where('subject', '!=', 'Отзыв');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListComplaints::route('/'),
            'edit' => Pages\EditComplaint::route('/{record}/edit'),
        ];
    }
}
