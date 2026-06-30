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
    {{-- Self-hosted Telegram SDK: telegram.org being slow/blocked must never stall the app start. --}}
    <script src="/js/telegram-web-app.js?v=1"></script>
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
    @inertia
</body>
</html>
