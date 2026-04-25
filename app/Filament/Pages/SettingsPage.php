<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Enums\PaymentMethod;
use App\Models\AppSetting;
use Filament\Forms\Components\CheckboxList;
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
        $defaultMethods = array_map(
            static fn (PaymentMethod $method): string => $method->value,
            PaymentMethod::withdrawalDefaults()
        );
        $savedMethods = array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', (string) AppSetting::get('withdrawal_methods', implode(',', $defaultMethods)))
        )));

        $this->form->fill([
            'auto_approve_applications' => AppSetting::bool('auto_approve_applications'),
            'withdrawal_methods' => $savedMethods !== [] ? $savedMethods : $defaultMethods,
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
                Section::make('Вывод средств')
                    ->description('Какие криптовалюты доступны моделям для вывода')
                    ->schema([
                        CheckboxList::make('withdrawal_methods')
                            ->label('Доступные криптовалюты')
                            ->options([
                                PaymentMethod::Usdt->value => PaymentMethod::Usdt->label(),
                                PaymentMethod::Btc->value => PaymentMethod::Btc->label(),
                                PaymentMethod::Ton->value => PaymentMethod::Ton->label(),
                            ])
                            ->columns(3)
                            ->required()
                            ->minItems(1),
                    ]),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();
        AppSetting::set('auto_approve_applications', $data['auto_approve_applications'] ? 'true' : 'false');
        $methods = array_values(array_filter((array) ($data['withdrawal_methods'] ?? [])));
        AppSetting::set(
            'withdrawal_methods',
            implode(',', $methods !== [] ? $methods : array_map(
                static fn (PaymentMethod $method): string => $method->value,
                PaymentMethod::withdrawalDefaults()
            ))
        );

        Notification::make()
            ->title('Настройки сохранены')
            ->success()
            ->send();
    }
}
