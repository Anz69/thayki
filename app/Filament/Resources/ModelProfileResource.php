<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ModelProfileResource\Pages;
use App\Models\ModelProfile;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ModelProfileResource extends Resource
{
    protected static ?string $model = ModelProfile::class;

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $navigationLabel = 'Профили моделей';

    protected static ?string $modelLabel = 'Профиль модели';

    protected static ?string $pluralModelLabel = 'Профили моделей';

    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('user_id')
                    ->label('Пользователь')
                    ->relationship('user', 'first_name')
                    ->searchable()
                    ->required(),
                Forms\Components\TextInput::make('display_name')
                    ->label('Отображаемое имя')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('age')
                    ->label('Возраст')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('height_cm')
                    ->label('Рост (см)')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('weight_kg')
                    ->label('Вес (кг)')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('bust_size')
                    ->label('Грудь')
                    ->required()
                    ->maxLength(16),
                Forms\Components\TextInput::make('butt_size')
                    ->label('Бёдра')
                    ->required()
                    ->maxLength(16),
                Forms\Components\Textarea::make('description')
                    ->label('Описание')
                    ->columnSpanFull(),
                Forms\Components\Select::make('schedule')
                    ->label('Расписание')
                    ->options([
                        'any' => 'Любое время',
                        'day' => 'День (07:00–20:00)',
                        'night' => 'Ночь (20:00–07:00)',
                    ])
                    ->required()
                    ->default('any'),
                Forms\Components\TextInput::make('hourly_rate_thb')
                    ->label('Цена за час (฿)')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('commission_override')
                    ->label('Индив. комиссия (%)')
                    ->helperText('Оставьте пустым для использования глобальной ставки.')
                    ->numeric()
                    ->minValue(0)
                    ->maxValue(50)
                    ->step(0.1)
                    ->suffix('%')
                    ->formatStateUsing(fn ($state) => $state === null
                        ? null
                        : round(((float) $state) * 100, 2))
                    ->dehydrateStateUsing(fn ($state) => ($state === null || $state === '')
                        ? null
                        : round(((float) $state) / 100, 4)),
                Forms\Components\Toggle::make('is_published')->label('Опубликована'),
                Forms\Components\Toggle::make('is_verified')->label('Верифицирована'),
                Forms\Components\DateTimePicker::make('published_at')->label('Опубликована (дата)'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('display_name')
                    ->label('Имя')
                    ->searchable(),
                Tables\Columns\TextColumn::make('age')->label('Возраст')->numeric()->sortable(),
                Tables\Columns\TextColumn::make('height_cm')->label('Рост')->numeric()->sortable(),
                Tables\Columns\TextColumn::make('weight_kg')->label('Вес')->numeric()->sortable(),
                Tables\Columns\TextColumn::make('bust_size')->label('Грудь')->searchable(),
                Tables\Columns\TextColumn::make('butt_size')->label('Бёдра')->searchable(),
                Tables\Columns\TextColumn::make('schedule')
                    ->label('Расписание')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'day' => 'День',
                        'night' => 'Ночь',
                        default => 'Любое',
                    }),
                Tables\Columns\TextColumn::make('hourly_rate_thb')
                    ->label('Цена/ч')
                    ->formatStateUsing(fn ($state) => '฿ '.number_format((int) $state))
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_published')->label('Опубл.')->boolean(),
                Tables\Columns\IconColumn::make('is_verified')->label('Верифиц.')->boolean(),
                Tables\Columns\TextColumn::make('published_at')->label('Опубл. (дата)')
                    ->dateTime('d.m.Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')->label('Создан')
                    ->dateTime('d.m.Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_published')->label('Опубликована'),
                Tables\Filters\TernaryFilter::make('is_verified')->label('Верифицирована'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()->label('Изменить'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()->label('Удалить выбранные'),
                ])->label('Действия'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListModelProfiles::route('/'),
            'create' => Pages\CreateModelProfile::route('/create'),
            'edit' => Pages\EditModelProfile::route('/{record}/edit'),
        ];
    }
}
