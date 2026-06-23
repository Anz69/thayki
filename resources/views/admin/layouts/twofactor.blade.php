<!DOCTYPE html>
<html lang="ru" class="antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="color-scheme" content="light dark">
    <title>@yield('title', 'Админ-панель')</title>
    <style>
        :root {
            --bg: #f4f4f5; --fg: #18181b; --muted: #71717a; --muted2: #a1a1aa;
            --card: #ffffff; --border: rgba(9,9,11,.06); --ring: rgba(9,9,11,.05);
            --field-bg: #fff; --field-border: #e4e4e7;
            --primary: #e11d48; --primary-hover: #be123c;
            --accent-soft: #fff1f2; --accent-ico: #f43f5e;
            --ok: #16a34a; --err: #e11d48; --warn-bg: #fffbeb; --warn-border: #fde68a; --warn-fg: #92400e;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #09090b; --fg: #fafafa; --muted: #a1a1aa; --muted2: #71717a;
                --card: #18181b; --border: rgba(255,255,255,.08); --ring: rgba(255,255,255,.06);
                --field-bg: #27272a; --field-border: #3f3f46;
                --accent-soft: rgba(244,63,94,.12);
                --warn-bg: rgba(245,158,11,.10); --warn-border: rgba(245,158,11,.30); --warn-fg: #fbbf24;
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: var(--bg); color: var(--fg); padding: 24px;
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .card {
            width: 100%; max-width: 400px; background: var(--card);
            border: 1px solid var(--border); border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,.07), 0 12px 40px rgba(0,0,0,.05);
            padding: 38px 30px 28px; text-align: center;
        }
        .ico {
            width: 52px; height: 52px; border-radius: 14px; background: var(--accent-soft);
            display: flex; align-items: center; justify-content: center; margin: 0 auto 18px;
        }
        .ico svg { width: 26px; height: 26px; color: var(--accent-ico); }
        h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; letter-spacing: -.01em; }
        p.sub { margin: 0 0 22px; color: var(--muted); font-size: 13.5px; line-height: 1.6; }
        ol.steps { text-align: left; margin: 0 0 22px; padding-left: 18px; color: var(--muted); font-size: 13px; line-height: 1.75; }
        ol.steps b { color: var(--fg); }
        input.code {
            width: 100%; text-align: center; letter-spacing: .42em; font-size: 24px; font-weight: 600;
            padding: 13px 12px; background: var(--field-bg); color: var(--fg);
            border: 1px solid var(--field-border); border-radius: 10px; outline: none;
            transition: border-color .15s, box-shadow .15s;
        }
        input.code::placeholder { color: var(--muted2); letter-spacing: .42em; }
        input.code:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--accent-soft); }
        .btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 11px 16px; border: 0; border-radius: 10px; cursor: pointer;
            background: var(--primary); color: #fff; font-size: 14px; font-weight: 600;
            text-decoration: none; transition: background .15s; font-family: inherit;
        }
        .btn:hover { background: var(--primary-hover); }
        .btn:active { transform: translateY(.5px); }
        .btn svg { width: 18px; height: 18px; }
        .mt { margin-top: 14px; }
        .err { margin-top: 14px; color: var(--err); font-size: 13px; font-weight: 500; }
        .status { margin-top: 14px; color: var(--ok); font-size: 13px; font-weight: 500; }
        .waiting { margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 9px; color: var(--muted2); font-size: 12.5px; }
        .spin { width: 15px; height: 15px; border: 2px solid var(--field-border); border-top-color: var(--primary); border-radius: 50%; animation: s .8s linear infinite; }
        @keyframes s { to { transform: rotate(360deg); } }
        .warn { color: var(--warn-fg); font-size: 13px; line-height: 1.5; background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 12px; padding: 12px 14px; text-align: left; }
        .warn code, .sub code { background: var(--ring); padding: 1px 5px; border-radius: 5px; font-size: 12px; }
        .foot { margin-top: 22px; }
        .foot button, .link-btn { background: none; border: 0; color: var(--muted2); font-size: 12.5px; cursor: pointer; text-decoration: underline; font-family: inherit; padding: 0; }
        a.link-btn { text-decoration: underline; }
        .timer { color: var(--muted2); font-size: 12.5px; }
        form.inline { display: inline; }
    </style>
</head>
<body>
    <div class="card">
        <div class="ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
        </div>
        @yield('content')
    </div>
    @yield('scripts')
</body>
</html>
