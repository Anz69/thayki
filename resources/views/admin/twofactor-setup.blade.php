<!DOCTYPE html>
<html lang="ru" class="antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Подключите двухфакторную защиту</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: radial-gradient(1200px 600px at 50% -10%, #fff1f5 0%, #f4f4f5 60%);
            color: #18181b; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            padding: 24px;
        }
        .card {
            width: 100%; max-width: 420px; background: #fff; border-radius: 20px;
            box-shadow: 0 16px 50px rgba(225,29,72,.10); padding: 36px 30px; text-align: center;
        }
        .ring { width: 60px; height: 60px; border-radius: 50%; background: #fff0f5;
            display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 28px; }
        h1 { font-size: 20px; margin: 0 0 8px; font-weight: 700; }
        p.sub { margin: 0 0 24px; color: #71717a; font-size: 14px; line-height: 1.55; }
        ol { text-align: left; margin: 0 0 24px; padding-left: 20px; color: #52525b; font-size: 13.5px; line-height: 1.7; }
        a.bind {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 14px; border-radius: 999px; text-decoration: none;
            background: #229ED9; color: #fff; font-size: 15px; font-weight: 600;
        }
        a.bind:active { opacity: .88; }
        .waiting { margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #a1a1aa; font-size: 13px; }
        .spin { width: 16px; height: 16px; border: 2px solid #e4e4e7; border-top-color: #f43f5e; border-radius: 50%; animation: s 0.8s linear infinite; }
        @keyframes s { to { transform: rotate(360deg); } }
        .warn { color: #b45309; font-size: 13px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 14px; }
        .logout { margin-top: 22px; }
        .logout button { background: none; border: 0; color: #a1a1aa; font-size: 12.5px; cursor: pointer; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <div class="ring">🛡️</div>
        <h1>Защитите вход в админку</h1>
        <p class="sub">Без двухфакторной аутентификации войти в панель нельзя. Привяжите Telegram — туда будут приходить коды подтверждения.</p>

        @if ($botConfigured && $link)
            <ol>
                <li>Нажмите кнопку ниже — откроется бот.</li>
                <li>В боте нажмите <b>«Да, привязать»</b>.</li>
                <li>Эта страница продолжит автоматически.</li>
            </ol>

            <a class="bind" href="{{ $link }}" target="_blank" rel="noopener">
                <span>Привязать Telegram</span>
            </a>

            <div class="waiting"><span class="spin"></span><span>Ожидаем привязку…</span></div>
        @else
            <div class="warn">
                Не задан <b>TELEGRAM_BOT_USERNAME</b> в <code>.env</code> — без него нельзя сформировать ссылку привязки.
                Добавьте его и обновите страницу.
            </div>
        @endif

        <div class="logout">
            <form method="POST" action="{{ url('/'.ltrim(config('admin.path','admin'),'/').'/logout') }}">
                @csrf
                <button type="submit">Выйти</button>
            </form>
        </div>
    </div>

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
</body>
</html>
