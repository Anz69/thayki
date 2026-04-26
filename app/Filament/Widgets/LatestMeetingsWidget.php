<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LatestMeetingsWidget extends BaseWidget
{
    protected static ?string $heading = 'Последние встречи';

    protected static ?int $sort = 4;

    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Meeting::query()
                    ->with(['client', 'modelProfile'])
                    ->latest()
                    ->limit(10),
            )
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->width('60px'),

                Tables\Columns\TextColumn::make('client.first_name')
                    ->label('Клиент')
                    ->description(fn (Meeting $r): string => $r->client ? '@' . ($r->client->username ?? '—') : '—')
                    ->searchable(),

                Tables\Columns\TextColumn::make('modelProfile.display_name')
                    ->label('Модель')
                    ->searchable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Статус')
                    ->badge()
                    ->formatStateUsing(fn (MeetingStatus $state): string => match ($state) {
                        MeetingStatus::Pending   => 'Ожидает',
                        MeetingStatus::Accepted  => 'Принято',
                        MeetingStatus::Paid      => 'Оплачено',
                        MeetingStatus::Confirmed => 'Подтверждено',
                        MeetingStatus::Completed => 'Завершено',
                        MeetingStatus::Cancelled => 'Отменено',
                        MeetingStatus::Rejected  => 'Отклонено',
                        MeetingStatus::Expired   => 'Просрочено',
                    })
                    ->color(fn (MeetingStatus $state): string => match ($state) {
                        MeetingStatus::Pending             => 'warning',
                        MeetingStatus::Accepted,
                        MeetingStatus::Paid                => 'info',
                        MeetingStatus::Confirmed,
                        MeetingStatus::Completed           => 'success',
                        MeetingStatus::Cancelled,
                        MeetingStatus::Rejected,
                        MeetingStatus::Expired             => 'danger',
                    }),

                Tables\Columns\TextColumn::make('price_thb')
                    ->label('Сумма')
                    ->formatStateUsing(fn ($state): string => number_format((int) $state) . ' ฿')
                    ->sortable(),

                Tables\Columns\TextColumn::make('duration_hours')
                    ->label('Длит.')
                    ->formatStateUsing(fn ($state): string => "{$state} ч")
                    ->alignCenter(),

                Tables\Columns\TextColumn::make('scheduled_at')
                    ->label('Встреча')
                    ->dateTime('d.m.Y H:i')
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Создано')
                    ->since()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\Action::make('view')
                    ->label('Открыть')
                    ->icon('heroicon-m-arrow-top-right-on-square')
                    ->url(fn (Meeting $r): string => route('filament.admin.resources.meetings.edit', $r))
                    ->openUrlInNewTab(),
            ])
            ->paginated(false)
            ->striped();
    }
}
