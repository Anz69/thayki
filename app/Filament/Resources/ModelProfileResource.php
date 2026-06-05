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

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $navigationGroup = 'Пользователи и модели';

    protected static ?string $navigationLabel = 'Модели (анкеты)';

    protected static ?string $modelLabel = 'Анкета модели';

    protected static ?string $pluralModelLabel = 'Модели (анкеты)';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('display_name')
                    ->label('Имя (RU)')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('display_name_en')
                    ->label('Имя (EN)')
                    ->maxLength(255),
                Forms\Components\TextInput::make('age')
                    ->label('Возраст')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('height_cm')
                    ->label('Рост (см)')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('bust_cm')
                    ->label('Грудь (обхват, см)')
                    ->numeric(),
                Forms\Components\TextInput::make('waist_cm')
                    ->label('Талия (см)')
                    ->numeric(),
                Forms\Components\TextInput::make('hips_cm')
                    ->label('Бёдра (см)')
                    ->numeric(),
                Forms\Components\TextInput::make('breast_size')
                    ->label('Размер груди (чашка)')
                    ->maxLength(16),
                Forms\Components\TextInput::make('eyes')
                    ->label('Цвет глаз')
                    ->maxLength(32),
                Forms\Components\Textarea::make('description')
                    ->label('Описание')
                    ->columnSpanFull(),
                Forms\Components\Toggle::make('is_published')->label('Опубликована')->default(true),
                Forms\Components\Toggle::make('is_verified')->label('Верифицирована')->default(true),
                Forms\Components\DateTimePicker::make('published_at')
                    ->label('Опубликована (дата)')
                    ->default(now()),
                Forms\Components\Select::make('user_id')
                    ->label('Пользователь (необязательно)')
                    ->helperText('Прототип-анкету можно создавать без привязки к пользователю.')
                    ->relationship('user', 'first_name')
                    ->searchable(),

                // Photos live at the very bottom — right above the save button —
                // so the form reads top-to-bottom and you confirm with the photos
                // in view. The `photo_files` key isn't a model column: the
                // Create/Edit pages strip it out and persist via syncPhotos().
                Forms\Components\Section::make('Фотографии')
                    ->icon('heroicon-o-photo')
                    ->columnSpanFull()
                    ->schema([
                        Forms\Components\FileUpload::make('photo_files')
                            ->hiddenLabel()
                            ->helperText('Можно выбрать сразу несколько. Перетаскивайте для смены порядка — первое фото станет главным.')
                            ->multiple()
                            ->image()
                            ->reorderable()
                            ->appendFiles()
                            ->panelLayout('grid')
                            ->disk('public')
                            ->directory('model-photos')
                            ->afterStateHydrated(function (Forms\Components\FileUpload $component, ?ModelProfile $record): void {
                                if ($record !== null) {
                                    $component->state(
                                        $record->photos()->orderBy('position')->pluck('path')->all(),
                                    );
                                }
                            })
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    /**
     * Reconcile a profile's ModelPhoto rows with the ordered list of paths
     * coming from the form's FileUpload (kept + newly uploaded). Removed files
     * are deleted from disk; order/main flag follow the list order.
     *
     * @param  list<string>  $paths
     */
    public static function syncPhotos(ModelProfile $profile, array $paths): void
    {
        $paths = array_values(array_filter($paths));
        $existing = $profile->photos()->get()->keyBy('path');

        foreach ($existing as $path => $photo) {
            if (! in_array($path, $paths, true)) {
                \Illuminate\Support\Facades\Storage::disk($photo->disk)->delete($photo->path);
                $photo->delete();
            }
        }

        foreach ($paths as $i => $path) {
            $photo = $existing->get($path);
            if ($photo !== null) {
                $photo->update(['position' => $i, 'is_main' => $i === 0]);
            } else {
                $profile->photos()->create([
                    'disk' => 'public',
                    'path' => $path,
                    'position' => $i,
                    'is_main' => $i === 0,
                ]);
            }
        }
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
                Tables\Columns\TextColumn::make('bust_cm')->label('Грудь')->numeric()->toggleable(),
                Tables\Columns\TextColumn::make('waist_cm')->label('Талия')->numeric()->toggleable(),
                Tables\Columns\TextColumn::make('hips_cm')->label('Бёдра')->numeric()->toggleable(),
                Tables\Columns\TextColumn::make('breast_size')->label('Размер груди'),
                Tables\Columns\TextColumn::make('eyes')->label('Глаза')->toggleable(),
                Tables\Columns\TextColumn::make('photos_count')->counts('photos')->label('Фото'),
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
                Tables\Actions\Action::make('leads')
                    ->label(fn (ModelProfile $record): string => 'Заявки ('.$record->leads()->count().')')
                    ->icon('heroicon-o-inbox-arrow-down')
                    ->color('warning')
                    ->modalHeading('Заявки по анкете')
                    ->modalContent(fn (ModelProfile $record) => view('filament.modals.model-leads', [
                        'leads' => $record->leads()->with('user')->get(),
                    ]))
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Закрыть'),
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
        // Photos are managed inside the form (above the save button) via the
        // FileUpload + syncPhotos, so no separate relation-manager panel below.
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
