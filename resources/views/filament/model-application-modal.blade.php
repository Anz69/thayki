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

   
        if (filter_var($url, FILTER_VALIDATE_URL)) {
            return $url;
        }

        if (str_starts_with($url, '/')) {
            return url($url);
        }


        if (str_starts_with($url, 'storage/')) {
            return asset($url);
        }

        return asset('storage/'.$url);
    };

    $photos = collect($payload['photos'] ?? [])
        ->map(fn ($photo) => $safeUrl($photo))
        ->filter()
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

    $userName = trim("{$record->user?->first_name} {$record->user?->last_name}");
    $userName = $userName !== '' ? $userName : ($record->user?->username ?? 'Пользователь');
@endphp

<div style="display: flex; flex-direction: column; gap: 18px; padding: 2px 0 4px;">
    <section style="border: 1px solid #2a2f39; background: #ffffff05; border-radius: 16px; padding: 16px;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px;">
            <div style="min-width: 0;">
                <p style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8f98a8;">
                    Профиль кандидата
                </p>
                <p style="margin: 6px 0 0; font-size: 24px; line-height: 28px; font-weight: 700; color: #f8fbff;">
                    {{ $userName }}
                </p>
                <p style="margin: 6px 0 0; font-size: 13px; line-height: 16px; color: #9ea7b7;">
                    {{ $record->user?->username ? '@'.$record->user->username : 'username не указан' }}
                </p>
            </div>
            <div style="display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid #3b4352; background: #ffffff05; padding: 7px 12px; font-size: 12px; line-height: 14px; font-weight: 600; color: #e5ebf7;">
                Статус: {{ $record->status?->value ?? $record->status ?? '—' }}
            </div>
        </div>
    </section>

    <section style="display: flex; flex-direction: column; gap: 10px;">
        <h3 style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8f98a8;">Параметры</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
            @foreach([
                'Имя/псевдоним' => $valueOrDash($payload['display_name'] ?? null),
                'Возраст' => $formatMeasure($payload['age'] ?? null, 'лет'),
                'Рост' => $formatMeasure($payload['height_cm'] ?? null, 'см'),
                'Вес' => $formatMeasure($payload['weight_kg'] ?? null, 'кг'),
                'Бюст' => $valueOrDash($payload['bust_size'] ?? null),
                'Ягодицы' => $valueOrDash($payload['butt_size'] ?? null),
            ] as $label => $value)
                <div style="border: 1px solid #2a2f39; border-radius: 14px; background: #ffffff05; padding: 11px 12px;">
                    <p style="margin: 0; font-size: 11px; line-height: 14px; color: #8f98a8;">{{ $label }}</p>
                    <p style="margin: 5px 0 0; font-size: 14px; line-height: 18px; font-weight: 600; color: #f2f6ff;">{{ $value }}</p>
                </div>
            @endforeach
        </div>
    </section>

    <section style="display: flex; flex-direction: column; gap: 10px;">
        <h3 style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8f98a8;">Прайс</h3>
        @if($priceOptions->isNotEmpty())
            <div style="display: flex; flex-direction: column; gap: 8px;">
                @foreach($priceOptions as $option)
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid #2a2f39; border-radius: 14px; background: #ffffff05; padding: 12px;">
                        <div>
                            <p style="margin: 0; font-size: 14px; line-height: 18px; font-weight: 600; color: #f2f6ff;">{{ $option['label'] }}</p>
                            <p style="margin: 4px 0 0; font-size: 11px; line-height: 14px; color: #8f98a8;">
                                {{ $option['hours'] ? ($option['hours'].' ч') : 'Длительность не указана' }}
                            </p>
                        </div>
                        <p style="margin: 0; font-size: 14px; line-height: 18px; font-weight: 700; color: #f2f6ff;">{{ $formatMoney($option['price_thb']) }}</p>
                    </div>
                @endforeach
            </div>
        @else
            <div style="border: 1px dashed #3a4352; border-radius: 14px; background: #ffffff05; padding: 12px; font-size: 13px; line-height: 18px; color: #8f98a8;">
                Прайс не заполнен.
            </div>
        @endif
    </section>

    <section style="display: flex; flex-direction: column; gap: 10px;">
        <h3 style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8f98a8;">Фото</h3>
        @if($photos->isNotEmpty())
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                @foreach($photos as $photo)
                    <a
                        href="{{ $photo }}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="position: relative; display: block; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 14px; border: 1px solid #2a2f39; background: #ffffff05;"
                    >
                        <img
                            src="{{ $photo }}"
                            alt="Фото модели"
                            loading="lazy"
                            style="display: block; width: 100%; height: 100%; object-fit: cover;"
                        >
                    </a>
                @endforeach
            </div>
        @else
            <div style="border: 1px dashed #3a4352; border-radius: 14px; background: #ffffff05; padding: 12px; font-size: 13px; line-height: 18px; color: #8f98a8;">
                Фотографии не приложены.
            </div>
        @endif
    </section>

    <section style="display: flex; flex-direction: column; gap: 10px;">
        <h3 style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8f98a8;">Служебная информация</h3>
        <div style="border: 1px solid #2a2f39; border-radius: 14px; background: #ffffff05; padding: 12px; font-size: 13px; line-height: 20px; color: #c8d0df;">
            <p style="margin: 0;"><span style="color: #8f98a8;">ID заявки:</span> <span style="font-weight: 600; color: #f2f6ff;">{{ $record->id }}</span></p>
            <p style="margin: 4px 0 0;"><span style="color: #8f98a8;">Подана:</span> <span style="font-weight: 600; color: #f2f6ff;">{{ $record->created_at?->format('d.m.Y H:i') ?? '—' }}</span></p>
            <p style="margin: 4px 0 0;"><span style="color: #8f98a8;">Обновлена:</span> <span style="font-weight: 600; color: #f2f6ff;">{{ $record->updated_at?->format('d.m.Y H:i') ?? '—' }}</span></p>
        </div>

        @if(filled($record->review_note ?? null) || filled($record->admin_note ?? null))
            <div style="border: 1px solid #6b5614; border-radius: 14px; background: #2e250d; padding: 12px; font-size: 13px; line-height: 20px; color: #f6e9bf; white-space: pre-wrap;">
                <p style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #f2d986;">
                    Заметка администратора
                </p>
                <p style="margin: 6px 0 0;">{{ $valueOrDash($record->review_note ?? $record->admin_note ?? null) }}</p>
            </div>
        @endif
    </section>
</div>
