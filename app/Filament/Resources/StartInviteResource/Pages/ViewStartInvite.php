<?php

declare(strict_types=1);

namespace App\Filament\Resources\StartInviteResource\Pages;

use App\Filament\Resources\StartInviteResource;
use App\Models\StartInvite;
use Filament\Actions;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;

class ViewStartInvite extends ViewRecord
{
    protected static string $resource = StartInviteResource::class;

    protected static ?string $title = 'Статистика по ссылке';

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make()->label('Изменить'),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Section::make('Ссылка')->schema([
                TextEntry::make('label')->label('Название')->placeholder('—'),
                TextEntry::make('kind')->label('Тип')->badge()
                    ->color(fn (string $state): string => $state === StartInvite::KIND_MODEL ? 'warning' : 'success')
                    ->formatStateUsing(fn (string $state): string => $state === StartInvite::KIND_MODEL ? 'Model' : 'Verify'),
                TextEntry::make('link')->label('Ссылка')->copyable()
                    ->state(function (StartInvite $record): string {
                        $bot = (string) config('telegram.bot_username', '');

                        return $bot !== '' ? "https://t.me/{$bot}?startapp={$record->token}" : $record->token;
                    }),
            ])->columns(3),

            Section::make('Статистика')->schema([
                TextEntry::make('came')->label('Пришло людей')->badge()->color('info')
                    ->state(fn (StartInvite $record): string => (string) $record->times_used),
                TextEntry::make('orders')->label('Заказов создано')->badge()->color('info')
                    ->state(fn (StartInvite $record): string => (string) $record->leads()->count()),
                TextEntry::make('buyers')->label('Из них с заказом')->badge()->color('info')
                    ->state(fn (StartInvite $record): string => (string) $record->buyersCount()),
                TextEntry::make('conversion')->label('Конверсия')->badge()
                    ->color(fn (StartInvite $record): string => $record->conversionPercent() >= 50 ? 'success' : ($record->conversionPercent() > 0 ? 'warning' : 'gray'))
                    ->state(fn (StartInvite $record): string => $record->conversionPercent().'%'),
            ])->columns(4),
        ]);
    }
}
