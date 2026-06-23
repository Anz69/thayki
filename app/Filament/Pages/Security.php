<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AdminUser;
use App\Services\Admin\AdminTwoFactor;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class Security extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-shield-check';

    protected static ?string $navigationGroup = 'Система';

    protected static ?string $navigationLabel = 'Защита (2FA)';

    protected static ?string $title = 'Двухфакторная защита';

    protected static string $view = 'filament.pages.security';

    /** @var array<string, mixed> */
    public ?array $passwordData = [];

    public function mount(): void
    {
        $this->form->fill();
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('current_password')
                    ->label('Текущий пароль')
                    ->password()->revealable()->required()->autocomplete('current-password'),
                TextInput::make('password')
                    ->label('Новый пароль')
                    ->password()->revealable()->required()->minLength(8)->confirmed()
                    ->autocomplete('new-password'),
                TextInput::make('password_confirmation')
                    ->label('Повторите новый пароль')
                    ->password()->revealable()->required()->autocomplete('new-password'),
            ])
            ->statePath('passwordData');
    }

    public function changePassword(): void
    {
        $admin = Auth::guard('admin')->user();
        if (! $admin instanceof AdminUser) {
            return;
        }

        $data = $this->form->getState();

        if (! Hash::check($data['current_password'], (string) $admin->password)) {
            Notification::make()->danger()->title('Текущий пароль неверный')->send();

            return;
        }

        $admin->forceFill(['password' => $data['password']])->save();
        $this->form->fill();

        Notification::make()->success()->title('Пароль изменён')->send();
    }

    public function unbind(): void
    {
        $admin = Auth::guard('admin')->user();
        if ($admin instanceof AdminUser) {
            app(AdminTwoFactor::class)->unbind($admin);
        }

        Notification::make()->title('Telegram отвязан')->success()->send();

        $this->redirect(static::getUrl());
    }

    public function getViewData(): array
    {
        $admin = Auth::guard('admin')->user();
        $linked = $admin instanceof AdminUser && $admin->tg_chat_id;
        $bot = trim((string) config('telegram.bot_username'));

        $link = null;
        if (! $linked && $admin instanceof AdminUser && $bot !== '') {
            $token = app(AdminTwoFactor::class)->createLinkToken($admin);
            $link = "https://t.me/{$bot}?start=adminlink-{$token}";
        }

        return [
            'linked' => (bool) $linked,
            'link' => $link,
            'botConfigured' => $bot !== '',
        ];
    }
}
