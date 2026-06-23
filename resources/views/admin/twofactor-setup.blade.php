@extends('admin.layouts.twofactor')

@section('title', 'Подключите двухфакторную защиту')

@section('content')
    <h1>Защитите вход в админку</h1>
    <p class="sub">Без двухфакторной аутентификации войти в панель нельзя. Привяжите Telegram — туда будут приходить коды подтверждения.</p>

    @if ($botConfigured && $link)
        <ol class="steps">
            <li>Нажмите кнопку ниже — откроется бот.</li>
            <li>В боте нажмите <b>«Да, привязать»</b>.</li>
            <li>Эта страница продолжит автоматически.</li>
        </ol>

        <a class="btn" href="{{ $link }}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.27a1 1 0 0 0-1.05-.16L3.6 11.05c-.84.34-.8 1.55.05 1.84l4.3 1.46 1.64 4.96c.27.81 1.32.98 1.83.3l2.32-3.06 4.36 3.2c.6.44 1.46.12 1.62-.6l2.7-13.9a1 1 0 0 0-.48-1.06ZM9.7 13.4l8.1-5.1-6.6 6.04a1 1 0 0 0-.3.6l-.26 2.06-.94-3.6Z"/></svg>
            <span>Привязать Telegram</span>
        </a>

        <div class="waiting"><span class="spin"></span><span>Ожидаем привязку…</span></div>
    @else
        <div class="warn">
            Не задан <code>TELEGRAM_BOT_USERNAME</code> в <code>.env</code> — без него нельзя сформировать ссылку привязки. Добавьте его и обновите страницу.
        </div>
    @endif

    <div class="foot">
        <form method="POST" action="{{ route('filament.admin.auth.logout') }}" class="inline">
            @csrf
            <button type="submit">Выйти</button>
        </form>
    </div>
@endsection

@section('scripts')
    @if ($botConfigured && $link)
    <script>
        (function () {
            var statusUrl = @json(route('admin.2fa.status'));
            var nextUrl   = @json(route('admin.2fa.show'));
            setInterval(function () {
                fetch(statusUrl, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (d) { if (d && d.linked) { window.location = nextUrl; } })
                    .catch(function () {});
            }, 2000);
        })();
    </script>
    @endif
@endsection
