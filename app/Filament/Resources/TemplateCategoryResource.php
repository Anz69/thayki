<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TemplateCategoryResource\Pages;
use App\Filament\Resources\TemplateCategoryResource\RelationManagers\SubcategoriesRelationManager;
use App\Models\TemplateCategory;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class TemplateCategoryResource extends Resource
{
    protected static ?string $model = TemplateCategory::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $navigationGroup = 'Обратная связь';

    protected static ?string $navigationLabel = 'Категории шаблонов';

    protected static ?string $modelLabel = 'Категория шаблонов';

    protected static ?string $pluralModelLabel = 'Категории шаблонов';

    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')
                ->label('Название категории')
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

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('position')->label('#')->sortable()->width('60px'),
                Tables\Columns\TextColumn::make('name')->label('Название')->searchable(),
                Tables\Columns\TextColumn::make('templates_count')->counts('templates')->label('Шаблонов'),
                Tables\Columns\TextColumn::make('updated_at')->label('Обновлена')
                    ->dateTime('d.m.Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->reorderable('position')
            ->defaultSort('position')
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

    public static function getRelations(): array
    {
        return [
            SubcategoriesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTemplateCategories::route('/'),
            'create' => Pages\CreateTemplateCategory::route('/create'),
            'edit' => Pages\EditTemplateCategory::route('/{record}/edit'),
        ];
    }
}
