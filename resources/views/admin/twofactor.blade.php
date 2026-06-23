<!DOCTYPE html>
<html lang="ru" class="antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Подтверждение входа</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: #f4f4f5; color: #18181b;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            padding: 24px;
        }
        .card {
            width: 100%; max-width: 380px; background: #fff; border-radius: 18px;
            box-shadow: 0 10px 40px rgba(0,0,0,.08); padding: 32px 28px; text-align: center;
        }
        .ring { width: 56px; height: 56px; border-radius: 50%; background: #fff0f5;
            display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 26px; }
        h1 { font-size: 19px; margin: 0 0 6px; font-weight: 700; }
        p.sub { margin: 0 0 22px; color: #71717a; font-size: 14px; line-height: 1.5; }
        input[name=code] {
            width: 100%; text-align: center; letter-spacing: .4em; font-size: 26px; font-weight: 700;
            padding: 14px 12px; border: 1.5px solid #e4e4e7; border-radius: 12px; outline: none;
            transition: border-color .15s;
        }
        input[name=code]:focus { border-color: #f43f5e; }
        button.primary {
            margin-top: 16px; width: 100%; padding: 13px; border: 0; border-radius: 999px;
            background: #f43f5e; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
            transition: opacity .15s;
        }
        button.primary:active { opacity: .85; }
        .err { margin-top: 14px; color: #e11d48; font-size: 13px; font-weight: 500; }
        .status { margin-top: 14px; color: #16a34a; font-size: 13px; font-weight: 500; }
        .resend { margin-top: 18px; }
        .resend button { background: none; border: 0; color: #71717a; font-size: 13px; cursor: pointer; text-decoration: underline; }
        form.inline { display: inline; }
    </style>
</head>
<body>
    <div class="card">
        <div class="ring">🔐</div>
        <h1>Подтверждение входа</h1>
        <p class="sub">Код отправлен в ваш Telegram. Введите 6&#8209;значный код, чтобы войти в админ&#8209;панель.</p>

        <form method="POST" action="{{ route('admin.2fa.verify') }}">
            @csrf
            <input
                name="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                pattern="[0-9]*"
                placeholder="••••••"
                autofocus
                required
            >
            <button type="submit" class="primary">Войти</button>
        </form>

        @error('code')
            <div class="err">{{ $message }}</div>
        @enderror
        @if (session('status'))
            <div class="status">{{ session('status') }}</div>
        @endif

        <div class="resend">
            <form method="POST" action="{{ route('admin.2fa.resend') }}" class="inline">
                @csrf
                <button type="submit">Отправить код ещё раз</button>
            </form>
        </div>
    </div>
</body>
</html>
