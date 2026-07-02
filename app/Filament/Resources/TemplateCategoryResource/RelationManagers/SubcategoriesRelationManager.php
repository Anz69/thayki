<?php

declare(strict_types=1);

namespace App\Filament\Resources\TemplateCategoryResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class SubcategoriesRelationManager extends RelationManager
{
    protected static string $relationship = 'subcategories';

    protected static ?string $title = 'Подкатегории';

    protected static ?string $modelLabel = 'подкатегория';

    protected static ?string $pluralModelLabel = 'Подкатегории';

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')
                ->label('Название подкатегории')
                ->required()
                ->maxLength(120)
                ->columnSpanFull(),
            Forms\Components\TextInput::make('position')
                ->label('Порядок')
                ->numeric()
                ->default(0)
                ->helperText('Меньшее число — выше в списке'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->reorderable('position')
            ->defaultSort('position')
            ->columns([
                Tables\Columns\TextColumn::make('position')->label('#')->sortable()->width('60px'),
                Tables\Columns\TextColumn::make('name')->label('Название')->searchable(),
                Tables\Columns\TextColumn::make('templates_count')->counts('templates')->label('Шаблонов'),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()->label('Добавить подкатегорию'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()->label('Изменить'),
                Tables\Actions\DeleteAction::make()->label('Удалить'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()->label('Удалить выбранные'),
                ])->label('Действия'),
            ]);
    }
}
