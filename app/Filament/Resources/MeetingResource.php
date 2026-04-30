<?php

namespace App\Filament\Resources;

use App\Enums\MeetingStatus;
use App\Filament\Resources\MeetingResource\Pages;
use App\Models\Meeting;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MeetingResource extends Resource
{
    protected static ?string $model = Meeting::class;
    protected static ?string $navigationIcon = 'heroicon-o-calendar';
    protected static ?string $navigationLabel = 'Встречи';
    protected static ?string $modelLabel = 'Встреча';
    protected static ?string $pluralModelLabel = 'Встречи';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('status')->label('Статус')
                ->options(collect(MeetingStatus::cases())
                    ->filter(fn ($c) => $c !== MeetingStatus::Confirmed)
                    ->mapWithKeys(fn ($c) => [$c->value => $c->label()]))
                ->required(),
            Forms\Components\DateTimePicker::make('scheduled_at')->label('Дата встречи')->required(),
            Forms\Components\TextInput::make('duration_hours')->label('Длительность (ч)')->numeric()->required(),
            Forms\Components\TextInput::make('price_thb')->label('Цена (฿)')->numeric()->required(),
            Forms\Components\Textarea::make('cancel_reason')->label('Причина отмены'),
        ]);
    }

    public static function table(Table $table): Table
    {
        $statusValue = static fn ($state): string => $state instanceof MeetingStatus
            ? $state->value
            : (string) ($state ?? '');

        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable()->label('ID'),
                Tables\Columns\TextColumn::make('client.first_name')->label('Клиент')
                    ->formatStateUsing(fn ($record) => trim("{$record->client?->first_name} {$record->client?->last_name}")
                        ?: ($record->client?->username ?? '—'))
                    ->url(fn (Meeting $record): ?string => $record->client_id
                        ? UserResource::getUrl('edit', ['record' => $record->client_id])
                        : null),
                Tables\Columns\TextColumn::make('modelProfile.display_name')->label('Модель')
                    ->url(fn (Meeting $record): ?string => $record->modelProfile?->user_id
                        ? ModelResource::getUrl('edit', ['record' => $record->modelProfile->user_id])
                        : null),
                Tables\Columns\BadgeColumn::make('status')->label('Статус')
                    ->formatStateUsing(fn ($state): string => MeetingStatus::tryFrom($statusValue($state))?->label() ?: ($statusValue($state) !== '' ? $statusValue($state) : '—'))
                    ->colors([
                        'warning' => fn ($state) => $statusValue($state) === MeetingStatus::Pending->value,
                        'primary' => fn ($state) => $statusValue($state) === MeetingStatus::Accepted->value,
                        'success' => fn ($state) => in_array($statusValue($state), [
                            MeetingStatus::Completed->value,
                            MeetingStatus::Paid->value,
                            MeetingStatus::Confirmed->value,
                        ], true),
                        'danger'  => fn ($state) => in_array($statusValue($state), [
                            MeetingStatus::Cancelled->value,
                            MeetingStatus::Rejected->value,
                            MeetingStatus::Expired->value,
                        ], true),
                    ]),
                Tables\Columns\TextColumn::make('scheduled_at')->label('Дата')->dateTime('d.m.Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('duration_hours')->label('Ч'),
                Tables\Columns\TextColumn::make('price_thb')->label('Цена')
                    ->formatStateUsing(fn ($state) => '฿ ' . number_format((float) ($state ?? 0))),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Статус')
                    ->options(collect(MeetingStatus::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])),
            ])
            ->actions([Tables\Actions\EditAction::make()->label('Изменить')])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array { return []; }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListMeetings::route('/'),
            'create' => Pages\CreateMeeting::route('/create'),
            'edit'   => Pages\EditMeeting::route('/{record}/edit'),
        ];
    }
}
