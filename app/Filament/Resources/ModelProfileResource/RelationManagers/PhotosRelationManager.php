<?php

declare(strict_types=1);

namespace App\Filament\Resources\ModelProfileResource\RelationManagers;

use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

/**
 * Manages a prototype profile's photos. Upload accepts ANY number of photos
 * (no 6-cap — that limit only existed in the old model self-upload flow).
 */
class PhotosRelationManager extends RelationManager
{
    protected static string $relationship = 'photos';

    protected static ?string $title = 'Фотографии';

    protected static ?string $modelLabel = 'фото';

    protected static ?string $pluralModelLabel = 'Фотографии';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->reorderable('position')
            ->defaultSort('position')
            ->columns([
                Tables\Columns\ImageColumn::make('path')
                    ->label('Фото')
                    ->disk('public')
                    ->height(120)
                    ->square(),
                Tables\Columns\IconColumn::make('is_main')->label('Главное')->boolean(),
                Tables\Columns\TextColumn::make('position')->label('№')->sortable(),
            ])
            ->headerActions([
                Tables\Actions\Action::make('upload')
                    ->label('Загрузить фото')
                    ->icon('heroicon-o-arrow-up-tray')
                    ->form([
                        Forms\Components\FileUpload::make('files')
                            ->label('Фотографии (можно сразу все)')
                            ->multiple()
                            ->image()
                            ->disk('public')
                            ->directory('model-photos')
                            ->reorderable()
                            ->required(),
                    ])
                    ->action(function (array $data): void {
                        $profile = $this->getOwnerRecord();
                        $start = (int) $profile->photos()->max('position') + 1;
                        $hasMain = $profile->photos()->where('is_main', true)->exists();

                        foreach (array_values($data['files'] ?? []) as $i => $path) {
                            $profile->photos()->create([
                                'disk' => 'public',
                                'path' => $path,
                                'position' => $start + $i,
                                'is_main' => ! $hasMain && $i === 0,
                            ]);
                        }
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('makeMain')
                    ->label('Сделать главным')
                    ->icon('heroicon-o-star')
                    ->hidden(fn ($record) => (bool) $record->is_main)
                    ->action(function ($record): void {
                        $record->modelProfile->photos()->update(['is_main' => false]);
                        $record->update(['is_main' => true]);
                    }),
                Tables\Actions\DeleteAction::make()
                    ->label('Удалить')
                    ->after(fn ($record) => Storage::disk($record->disk)->delete($record->path)),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make()->label('Удалить выбранные'),
            ]);
    }
}
