<?php

namespace App\Filament\Resources\ComplaintResource\Pages;

use App\Filament\Pages\SupportChats;
use App\Filament\Resources\ComplaintResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditComplaint extends EditRecord
{
    protected static string $resource = ComplaintResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('open_support_chat')
                ->label('Открыть чат')
                ->icon('heroicon-o-chat-bubble-left-right')
                ->color('info')
                ->visible(fn (): bool => $this->record->user_id !== null)
                ->url(fn (): string => SupportChats::getUrl().'?user='.$this->record->user_id),
            ...parent::getHeaderActions(),
        ];
    }
}
