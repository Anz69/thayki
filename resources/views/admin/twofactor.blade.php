@extends('admin.layouts.twofactor')

@section('title', 'Подтверждение входа')

@section('content')
    <h1>Подтверждение входа</h1>
    <p class="sub">Код отправлен в ваш Telegram. Введите 6&#8209;значный код, чтобы войти в админ&#8209;панель.</p>

    <form method="POST" action="{{ route('admin.2fa.verify') }}">
        @csrf
        <input
            class="code"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            pattern="[0-9]*"
            placeholder="••••••"
            autofocus
            required
        >
        <button type="submit" class="btn mt">Войти</button>
    </form>

    @error('code')
        <div class="err">{{ $message }}</div>
    @enderror
    @if (session('status'))
        <div class="status">{{ session('status') }}</div>
    @endif

    <div class="foot">
        <form method="POST" action="{{ route('admin.2fa.resend') }}" class="inline">
            @csrf
            <button type="submit" class="link-btn">Отправить код ещё раз</button>
        </form>
    </div>
@endsection
