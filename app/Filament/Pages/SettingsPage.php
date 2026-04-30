<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AppSetting;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
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
        $pendingTtl  = (int) AppSetting::get('meeting_pending_ttl',  env('MEETING_PENDING_TTL',  600));
        $confirmTtl  = (int) AppSetting::get('meeting_model_confirm_ttl', env('MEETING_MODEL_CONFIRM_TTL', 7200));

        $this->form->fill([
            'auto_approve_applications'  => AppSetting::bool('auto_approve_applications'),
            'meeting_pending_ttl_min'    => (int) round($pendingTtl / 60),
            'meeting_confirm_ttl_min'    => (int) round($confirmTtl / 60),
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

                Section::make('Тайм-ауты встреч')
                    ->description('Управление временем автоматической отмены заказов')
                    ->schema([
                        TextInput::make('meeting_pending_ttl_min')
                            ->label('Ожидание ответа модели (минуты)')
                            ->helperText('Заказ переходит в «Истёк» если модель не ответила за это время')
                            ->numeric()
                            ->minValue(1)
                            ->maxValue(1440)
                            ->suffix('мин')
                            ->required(),
                        TextInput::make('meeting_confirm_ttl_min')
                            ->label('Авто-отмена без подтверждения (минуты)')
                            ->helperText('Заказ отменяется автоматически если модель не подтвердила встречу')
                            ->numeric()
                            ->minValue(1)
                            ->maxValue(10080)
                            ->suffix('мин')
                            ->required(),
                    ])
                    ->columns(2),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        AppSetting::set('auto_approve_applications', $data['auto_approve_applications'] ? 'true' : 'false');
        AppSetting::set('meeting_pending_ttl',       (string) ((int) $data['meeting_pending_ttl_min'] * 60));
        AppSetting::set('meeting_model_confirm_ttl', (string) ((int) $data['meeting_confirm_ttl_min'] * 60));

        Notification::make()
            ->title('Настройки сохранены')
            ->success()
            ->send();
    }
}
