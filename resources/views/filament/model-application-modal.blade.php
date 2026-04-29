@php
    $payload = is_array($record->payload) ? $record->payload : [];

    $valueOrDash = static fn ($value): string => filled($value) ? (string) $value : '—';
    $formatMoney = static fn ($value): string => is_numeric($value) ? ('฿ '.number_format((float) $value)) : '—';
    $formatMeasure = static fn ($value, string $unit): string => is_numeric($value) ? ((string) $value.' '.$unit) : '—';
    $safeUrl = static function ($url): ?string {
        if (! is_string($url)) {
            return null;
        }

        $url = trim($url);
        if ($url === '') {
            return null;
        }

        return filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
    };

    $photos = collect($payload['photos'] ?? [])
        ->filter(fn ($photo) => is_string($photo) && filter_var($photo, FILTER_VALIDATE_URL))
        ->values();

    $priceOptions = collect($payload['price_options'] ?? [])
        ->filter(fn ($option) => is_array($option))
        ->map(function (array $option) {
            $label = trim((string) ($option['label'] ?? ''));
            $hours = $option['hours'] ?? null;
            $price = $option['price_thb'] ?? null;

            if ($label === '' && ! is_numeric($hours) && ! is_numeric($price)) {
                return null;
            }

            return [
                'label' => $label !== '' ? $label : 'Тариф',
                'hours' => is_numeric($hours) ? (int) $hours : null,
                'price_thb' => is_numeric($price) ? (float) $price : null,
            ];
        })
        ->filter()
        ->values();

    $contact = is_array($payload['contact'] ?? null) ? $payload['contact'] : [];
    $telegram = trim((string) ($contact['telegram'] ?? ''));
    $telegram = ltrim($telegram, '@');

    $userName = trim("{$record->user?->first_name} {$record->user?->last_name}");
    $userName = $userName !== '' ? $userName : ($record->user?->username ?? 'Пользователь');
@endphp

<div class="space-y-5">
    <section class="rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-4 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
                <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Профиль кандидата</p>
                <p class="mt-1 text-lg font-medium text-gray-900">{{ $userName }}</p>
                <p class="mt-0.5 text-sm text-gray-600">
                    {{ $record->user?->username ? '@'.$record->user->username : 'username не указан' }}
                </p>
            </div>
            <div class="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                Статус: {{ $record->status?->value ?? $record->status ?? '—' }}
            </div>
        </div>
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Параметры</h3>
        <div class="grid gap-2.5 sm:grid-cols-2">
            @foreach([
                'Имя/псевдоним' => $valueOrDash($payload['display_name'] ?? null),
                'Возраст' => $formatMeasure($payload['age'] ?? null, 'лет'),
                'Рост' => $formatMeasure($payload['height_cm'] ?? null, 'см'),
                'Вес' => $formatMeasure($payload['weight_kg'] ?? null, 'кг'),
                'Бюст' => $valueOrDash($payload['bust_size'] ?? null),
                'Ягодицы' => $valueOrDash($payload['butt_size'] ?? null),
                'График' => $valueOrDash($payload['schedule'] ?? null),
                'Ставка в час' => $formatMoney($payload['hourly_rate_thb'] ?? null),
            ] as $label => $value)
                <div class="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
                    <p class="text-[11px] text-gray-500">{{ $label }}</p>
                    <p class="mt-1 text-sm font-medium text-gray-900">{{ $value }}</p>
                </div>
            @endforeach
        </div>
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">О себе</h3>
        <div class="rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
            {{ $valueOrDash($payload['description'] ?? null) }}
        </div>
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Прайс</h3>
        @if($priceOptions->isNotEmpty())
            <div class="space-y-2">
                @foreach($priceOptions as $option)
                    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3">
                        <div>
                            <p class="text-sm font-medium text-gray-900">{{ $option['label'] }}</p>
                            <p class="text-[11px] text-gray-500">{{ $option['hours'] ? ($option['hours'].' ч') : 'Длительность не указана' }}</p>
                        </div>
                        <p class="text-sm font-medium text-gray-900">{{ $formatMoney($option['price_thb']) }}</p>
                    </div>
                @endforeach
            </div>
        @else
            <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3.5 py-3 text-sm text-gray-500">
                Прайс не заполнен.
            </div>
        @endif
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Контакты</h3>
        <div class="grid gap-2.5 sm:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
                <p class="text-[11px] text-gray-500">Телефон</p>
                <p class="mt-1 text-sm font-medium text-gray-900">{{ $valueOrDash($contact['phone'] ?? null) }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
                <p class="text-[11px] text-gray-500">Telegram</p>
                @if($telegram !== '')
                    <a class="mt-1 inline-flex text-sm font-medium text-primary-600 hover:text-primary-500" href="https://t.me/{{ $telegram }}" target="_blank" rel="noopener noreferrer">
                        @{{ $telegram }}
                    </a>
                @else
                    <p class="mt-1 text-sm font-medium text-gray-900">—</p>
                @endif
            </div>
        </div>
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Фото</h3>
        @if($photos->isNotEmpty())
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                @foreach($photos as $photo)
                    <a
                        href="{{ $safeUrl($photo) }}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="group block aspect-3/4 overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                    >
                        <img
                            src="{{ $photo }}"
                            alt="Фото модели"
                            loading="lazy"
                            class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        >
                    </a>
                @endforeach
            </div>
        @else
            <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3.5 py-3 text-sm text-gray-500">
                Фотографии не приложены.
            </div>
        @endif
    </section>

    <section class="space-y-2.5">
        <h3 class="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">Служебная информация</h3>
        <div class="rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-700">
            <p><span class="text-gray-500">ID заявки:</span> <span class="font-medium text-gray-900">{{ $record->id }}</span></p>
            <p class="mt-1"><span class="text-gray-500">Подана:</span> <span class="font-medium text-gray-900">{{ $record->created_at?->format('d.m.Y H:i') ?? '—' }}</span></p>
            <p class="mt-1"><span class="text-gray-500">Обновлена:</span> <span class="font-medium text-gray-900">{{ $record->updated_at?->format('d.m.Y H:i') ?? '—' }}</span></p>
        </div>
        @if(filled($record->review_note ?? null) || filled($record->admin_note ?? null))
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 whitespace-pre-wrap">
                <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">Заметка администратора</p>
                <p class="mt-1.5">{{ $valueOrDash($record->review_note ?? $record->admin_note ?? null) }}</p>
            </div>
        @endif
    </section>
</div>
