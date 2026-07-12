<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AppSetting;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class NotificationSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-bell-alert';

    protected static ?string $navigationGroup = 'Система';

    protected static ?string $navigationLabel = 'Уведомления';

    protected static ?string $title = 'Уведомления о новых пользователях';

    protected static ?int $navigationSort = 3;

    protected static string $view = 'filament.pages.notification-settings';

    /** @var array<string, mixed> */
    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'new_user_notify_enabled' => AppSetting::bool('new_user_notify_enabled'),
            'new_user_notify_tg_id' => (string) AppSetting::get('new_user_notify_tg_id', ''),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Toggle::make('new_user_notify_enabled')
                    ->label('Уведомлять о новых пользователях')
                    ->helperText('Когда кто-то впервые нажимает /start, бот пришлёт уведомление на указанный Telegram ID.'),
                TextInput::make('new_user_notify_tg_id')
                    ->label('Telegram ID для уведомлений')
                    ->helperText('Ваш числовой Telegram ID (можно узнать у @userinfobot). Бот должен быть у вас в переписке.')
                    ->numeric()
                    ->rule('regex:/^-?\d+$/')
                    ->requiredIf('new_user_notify_enabled', true),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        AppSetting::set('new_user_notify_enabled', $data['new_user_notify_enabled'] ? '1' : '0');
        AppSetting::set('new_user_notify_tg_id', trim((string) ($data['new_user_notify_tg_id'] ?? '')));

        Notification::make()->success()->title('Сохранено')->send();
    }
}
