<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AdminUser;
use App\Services\Admin\AdminTwoFactor;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Auth;

class Security extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-shield-check';

    protected static ?string $navigationGroup = 'Система';

    protected static ?string $navigationLabel = 'Защита (2FA)';

    protected static ?string $title = 'Двухфакторная защита';

    protected static string $view = 'filament.pages.security';

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

    public function unbind(): void
    {
        $admin = Auth::guard('admin')->user();
        if ($admin instanceof AdminUser) {
            app(AdminTwoFactor::class)->unbind($admin);
        }

        Notification::make()->title('Telegram отвязан')->success()->send();

        $this->redirect(static::getUrl());
    }
}
