<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Dashboard;
use Filament\Infolists\Components\TextEntry;
use Filament\Support\Facades\FilamentView;
use Filament\Tables\Columns\TextColumn;
use Filament\View\PanelsRenderHook;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    // Resolve the viewer's IANA timezone from the plaintext `tz` cookie set by the
    // browser (see the injected script below). Falls back to the app timezone.
    private static function viewerTimezone(): string
    {
        $tz = $_COOKIE['tz'] ?? null;

        return (is_string($tz) && in_array($tz, timezone_identifiers_list(), true))
            ? $tz
            : (string) config('app.timezone');
    }

    public function boot(): void
    {
        // Show every date/time in tables and infolists in the viewer's own timezone
        // (times are stored in UTC), instead of the server timezone.
        TextColumn::configureUsing(fn (TextColumn $column) => $column->timezone(fn () => self::viewerTimezone()));
        TextEntry::configureUsing(fn (TextEntry $entry) => $entry->timezone(fn () => self::viewerTimezone()));

        // Publish the browser timezone into a cookie so the server can format times in
        // it. On the very first visit (cookie absent) reload once so the current page
        // picks it up immediately.
        FilamentView::registerRenderHook(
            PanelsRenderHook::HEAD_END,
            fn (): string => <<<'HTML'
<script>
(function(){
  try{
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(!tz) return;
    var m = document.cookie.match(/(?:^|; )tz=([^;]+)/);
    var cur = m ? decodeURIComponent(m[1]) : null;
    if(cur !== tz){
      document.cookie = 'tz='+encodeURIComponent(tz)+';path=/;max-age=31536000;samesite=lax';
      if(!cur) location.reload();
    }
  }catch(e){}
})();
</script>
HTML,
        );
    }

    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path((string) config('admin.path', 'admin'))
            ->login()
            ->authGuard('admin')
            ->brandName('Админка')
            ->colors([
                'primary' => Color::Rose,
            ])

            ->navigationGroups([
                NavigationGroup::make()->label('Пользователи и модели'),
                NavigationGroup::make()->label('Заявки'),
                NavigationGroup::make()->label('Финансы'),
                NavigationGroup::make()->label('Обратная связь'),
                NavigationGroup::make()->label('Поддержка'),
                NavigationGroup::make()->label('Система'),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                Widgets\AccountWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
                \App\Http\Middleware\EnsureAdminTwoFactor::class,
            ]);
    }
}
