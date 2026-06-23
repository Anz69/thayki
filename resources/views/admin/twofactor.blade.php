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
        <form method="POST" action="{{ route('admin.2fa.resend') }}" class="inline" id="resend-form" style="display:none">
            @csrf
            <button type="submit" class="link-btn">Отправить код ещё раз</button>
        </form>
        <span class="timer" id="resend-timer" style="display:none"></span>
    </div>
@endsection

@section('scripts')
<script>
    (function () {
        var remain = {{ (int) ($resendIn ?? 0) }};
        var form = document.getElementById('resend-form');
        var timer = document.getElementById('resend-timer');

        function fmt(s) {
            var m = Math.floor(s / 60), x = s % 60;
            return m + ':' + (x < 10 ? '0' : '') + x;
        }
        function tick() {
            if (remain <= 0) {
                timer.style.display = 'none';
                form.style.display = 'inline';
                return;
            }
            timer.textContent = 'Запросить новый код можно через ' + fmt(remain);
            timer.style.display = 'inline';
            form.style.display = 'none';
            remain -= 1;
            setTimeout(tick, 1000);
        }
        tick();
    })();
</script>
@endsection
