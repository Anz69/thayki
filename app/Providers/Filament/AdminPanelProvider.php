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
    public function boot(): void
    {
        // Show every date/time in tables and infolists in the viewer's own timezone
        // (times are stored in UTC), instead of the server timezone.
        TextColumn::configureUsing(fn (TextColumn $column) => $column->timezone(fn () => \App\Support\DisplayTimezone::get()));
        TextEntry::configureUsing(fn (TextEntry $entry) => $entry->timezone(fn () => \App\Support\DisplayTimezone::get()));

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
    if(cur === tz) return;
    document.cookie = 'tz='+encodeURIComponent(tz)+';path=/;max-age=31536000;samesite=lax';
    // Reload once so the current page re-renders in the viewer's timezone. Guard with
    // sessionStorage so a browser that refuses cookies can't loop forever.
    if(!cur && !sessionStorage.getItem('tz_reloaded')){
      sessionStorage.setItem('tz_reloaded','1');
      location.reload();
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
