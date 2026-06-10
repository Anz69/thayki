<?php

namespace App\Filament\Resources\ModelProfileResource\Pages;

use App\Filament\Resources\ModelProfileResource;
use App\Models\ModelProfile;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditModelProfile extends EditRecord
{
    protected static string $resource = ModelProfileResource::class;

    protected array $photoFiles = [];

    protected function mutateFormDataBeforeSave(array $data): array
    {
        $this->photoFiles = array_values((array) ($data['photo_files'] ?? []));
        unset($data['photo_files']);

        return $data;
    }

    protected function afterSave(): void
    {
        ModelProfileResource::syncPhotos($this->record, $this->photoFiles);
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('leads')
                ->label(fn (): string => 'Заявки ('.$this->record->leads()->count().')')
                ->icon('heroicon-o-inbox-arrow-down')
                ->color('warning')
                ->modalHeading('Заявки по анкете')
                ->modalContent(fn () => view('filament.modals.model-leads', [
                    'leads' => $this->record->leads()->with('user')->get(),
                ]))
                ->modalSubmitAction(false)
                ->modalCancelActionLabel('Закрыть'),
            Actions\DeleteAction::make(),
        ];
    }
}
