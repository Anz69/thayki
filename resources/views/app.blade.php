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
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    @viteReactRefresh
    @vite(['resources/js/app.jsx', 'resources/css/app.css'])
    @inertiaHead
</head>
<body class="bg-white">
    @inertia
</body>
</html>
