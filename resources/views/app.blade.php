<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Rus-Model Agency</title>
    <meta name="description" content="Rus-Model — модельное агентство. Проверенные модели, конфиденциально и безопасно.">
    <meta name="application-name" content="Rus-Model Agency">
    <meta name="apple-mobile-web-app-title" content="Rus-Model">
    <meta name="theme-color" content="#ffffff">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Rus-Model Agency">
    <meta property="og:description" content="Проверенные модели — конфиденциально и безопасно.">
    <meta property="og:site_name" content="Rus-Model Agency">
    {{-- Self-hosted Telegram SDK. `defer` so it never render-blocks the boot splash
         (it still runs before the app module, which is also deferred, by document order).
         data-cfasync="false" stops Cloudflare Rocket Loader from rewriting/breaking it. --}}
    <script defer data-cfasync="false" src="/js/telegram-web-app.js?v=1"></script>
    {{-- Inline boot splash: pure HTML/CSS, no Tailwind, no JS bundle — so the user never
         sees a blank white screen while the JS chunks load. React removes it on mount. --}}
    <style>
        #boot-splash{position:fixed;inset:0;background:#fff;display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:opacity .25s ease}
        #boot-splash .bs-ring{width:40px;height:40px;border-radius:50%;border:3px solid #f1d8e8;border-top-color:#E2319B;animation:bs-spin .8s linear infinite}
        @keyframes bs-spin{to{transform:rotate(360deg)}}
    </style>
    @viteReactRefresh
    @vite(['resources/js/app.jsx', 'resources/css/app.css'])
    @inertiaHead
</head>
<body class="bg-white">
    <div id="boot-splash"><div class="bs-ring"></div></div>
    <script data-cfasync="false">
    /* Bundle-independent recovery watchdog. If the JS bundle never boots (flaky/slow
       connection, a dropped chunk, etc.) the inline spinner would spin forever. This
       runs from the HTML itself — no Vite bundle needed — and, after a grace period,
       swaps the spinner for a "Reload" screen. React removes #boot-splash on mount,
       which is our signal that the app booted. */
    (function () {
      var FIRST = 9000, FINAL = 18000;
      function el(tag, css, text) { var e = document.createElement(tag); if (css) e.setAttribute('style', css); if (text != null) e.textContent = text; return e; }
      function offer(msg) {
        var sp = document.getElementById('boot-splash');
        if (!sp) return; /* app booted */
        try {
          sp.replaceChildren();
          var box = el('div', 'display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif');
          box.appendChild(el('div', 'font-size:42px', '😕'));
          box.appendChild(el('div', 'color:#111;font-size:16px;font-weight:600', 'Не удалось загрузить'));
          box.appendChild(el('div', 'color:#888;font-size:13px;line-height:1.5;max-width:260px', msg));
          var b = el('button', 'margin-top:4px;padding:13px 26px;border:none;border-radius:9999px;background:#E2319B;color:#fff;font-size:15px;font-weight:600', 'Перезагрузить');
          b.addEventListener('click', function () { try { sessionStorage.clear(); } catch (e) {} location.reload(); });
          box.appendChild(b);
          sp.appendChild(box);
          sp.style.opacity = '1';
        } catch (e) {}
      }
      /* Soft nudge first (keep a spinner but hint), hard reload screen later. */
      var t1 = setTimeout(function () {
        var sp = document.getElementById('boot-splash');
        if (sp && sp.querySelector('.bs-ring')) {
          var hint = el('div', 'margin-top:18px;color:#aaa;font-size:12px;font-family:-apple-system,system-ui,sans-serif', 'Загрузка…');
          sp.appendChild(hint);
        }
      }, FIRST);
      var t2 = setTimeout(function () { offer('Похоже, нестабильное соединение. Попробуйте ещё раз.'); }, FINAL);
      window.__bootWatchdog = function () { try { clearTimeout(t1); clearTimeout(t2); } catch (e) {} };
      /* If the bundle's own <script> errors out (404/parse), don't wait — offer now. */
      window.addEventListener('error', function (ev) {
        var t = ev && ev.target;
        if (t && t.tagName === 'SCRIPT' && /\/build\/assets\//.test(t.src || '')) {
          offer('Не удалось загрузить приложение. Проверьте соединение.');
        }
      }, true);
    })();
    </script>
    @inertia
</body>
</html>
