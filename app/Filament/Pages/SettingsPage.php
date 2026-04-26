<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AppSetting;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class SettingsPage extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon  = 'heroicon-o-cog-6-tooth';
    protected static ?string $navigationLabel = 'Настройки';
    protected static string  $view            = 'filament.pages.settings-page';
    protected static ?int    $navigationSort  = 99;

    /** @var array<string, mixed> */
    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'auto_approve_applications' => AppSetting::bool('auto_approve_applications'),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Заявки моделей')
                    ->description('Управление процессом рассмотрения заявок')
                    ->schema([
                        Toggle::make('auto_approve_applications')
                            ->label('Авто-одобрение заявок')
                            ->helperText('При включении все новые заявки одобряются мгновенно без ручной проверки')
                            ->onColor('success'),
                    ]),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();
        AppSetting::set('auto_approve_applications', $data['auto_approve_applications'] ? 'true' : 'false');

        Notification::make()
            ->title('Настройки сохранены')
            ->success()
            ->send();
    }
}
