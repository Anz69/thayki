@php
    $payload = is_array($record->payload) ? $record->payload : [];

    $valueOrDash = static fn ($value): string => filled($value) ? (string) $value : '—';
    $formatMoney = static fn ($value): string => is_numeric($value) ? ('฿ '.number_format((float) $value)) : '—';
    $formatMeasure = static fn ($value, string $unit): string => is_numeric($value) ? ((string) $value.' '.$unit) : '—';
    $safeUrl = static function ($url): ?string {
        if (is_array($url)) {
            // Backward-compatible shape support:
            // - { url: "..." }
            // - { path: "..." }
            return $url['url'] ?? $url['path'] ?? null
                ? $safeUrl($url['url'] ?? $url['path'])
                : null;
        }
        if (is_object($url)) {
            /** @var object $url */
            $maybeUrl = $url->url ?? $url->path ?? null;
            return is_string($maybeUrl) ? $safeUrl($maybeUrl) : null;
        }

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
            <div id="modelAppPhotoRoot-{{ $record->id }}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                @foreach($photos as $photo)
                    <button
                        type="button"
                        data-photo-src="{{ $photo }}"
                        data-photo-index="{{ $loop->index }}"
                        data-photo-alt="Фото модели"
                        onclick="(function(){var overlay=document.getElementById('modelAppPhotoOverlay-{{ $record->id }}');var root=document.getElementById('modelAppPhotoRoot-{{ $record->id }}');if(!overlay||!root)return;var photoBtns=Array.from(root.querySelectorAll('[data-photo-src]'));var photos=photoBtns.map(function(b){return{src:b.getAttribute('data-photo-src'),alt:b.getAttribute('data-photo-alt')||'Фото модели'}}).filter(function(p){return p.src});if(!photos.length)return;var counterEl=overlay.querySelector('[data-photo-counter]');var imgEl=overlay.querySelector('[data-photo-main]');var render=function(i){var index=(i+photos.length)%photos.length;overlay.dataset.photoIndex=String(index);var p=photos[index];imgEl.src=p.src;imgEl.alt=p.alt;counterEl.textContent='Фото '+(index+1)+' из '+photos.length;};var startIndex=Number(this.getAttribute('data-photo-index')||0);render(startIndex);overlay.style.display='flex';overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.addEventListener('keydown',function onKeyDown(e){if(e.key==='Escape'){overlay.style.display='none';overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';}}, {once:true});}).call(this);"
                        style="position: relative; display: block; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 14px; border: 1px solid #2a2f39; background: #ffffff05;"
                    >
                        <img
                            src="{{ $photo }}"
                            alt="Фото модели"
                            loading="lazy"
                            style="display: block; width: 100%; height: 100%; object-fit: cover;"
                        >
                    </button>
                @endforeach
            </div>

            {{-- Photo overlay viewer (arrows + ESC) --}}
            <div
                id="modelAppPhotoOverlay-{{ $record->id }}"
                onclick="if(event && event.target===event.currentTarget){var overlay=document.getElementById('modelAppPhotoOverlay-{{ $record->id }}');if(!overlay)return;overlay.style.display='none';overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';}"
                style="display:none; position:fixed; inset:0; z-index:999999; background: rgba(0,0,0,0.88); align-items:center; justify-content:center; padding:24px;"
                aria-hidden="true"
            >
                <div style="position:relative; width:100%; max-width:980px; display:flex; flex-direction:column; gap:14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <button
                            type="button"
                            data-photo-prev
                            onclick="event && event.stopPropagation && event.stopPropagation();(function(){var overlay=document.getElementById('modelAppPhotoOverlay-{{ $record->id }}');if(!overlay||overlay.style.display==='none')return;var root=document.getElementById('modelAppPhotoRoot-{{ $record->id }}');if(!root)return;var photoBtns=Array.from(root.querySelectorAll('[data-photo-src]'));var photos=photoBtns.map(function(b){return{src:b.getAttribute('data-photo-src'),alt:b.getAttribute('data-photo-alt')||'Фото модели'}}).filter(function(p){return p.src});if(!photos.length)return;var counterEl=overlay.querySelector('[data-photo-counter]');var imgEl=overlay.querySelector('[data-photo-main]');var current=Number(overlay.dataset.photoIndex||0);var next=current-1;var index=(next+photos.length)%photos.length;overlay.dataset.photoIndex=String(index);var p=photos[index];imgEl.src=p.src;imgEl.alt=p.alt;counterEl.textContent='Фото '+(index+1)+' из '+photos.length;})();"
                            style="width:44px; height:44px; border-radius:999px; border:none; background:rgba(255,255,255,0.12); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            aria-label="Предыдущее фото"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M11.5 3.5L6.5 9L11.5 14.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>

                        <div style="flex:1; text-align:center; color:#fff; font-weight:600; font-size:14px; line-height:18px;" data-photo-counter></div>

                        <button
                            type="button"
                            data-photo-next
                            onclick="event && event.stopPropagation && event.stopPropagation();(function(){var overlay=document.getElementById('modelAppPhotoOverlay-{{ $record->id }}');if(!overlay||overlay.style.display==='none')return;var root=document.getElementById('modelAppPhotoRoot-{{ $record->id }}');if(!root)return;var photoBtns=Array.from(root.querySelectorAll('[data-photo-src]'));var photos=photoBtns.map(function(b){return{src:b.getAttribute('data-photo-src'),alt:b.getAttribute('data-photo-alt')||'Фото модели'}}).filter(function(p){return p.src});if(!photos.length)return;var counterEl=overlay.querySelector('[data-photo-counter]');var imgEl=overlay.querySelector('[data-photo-main]');var current=Number(overlay.dataset.photoIndex||0);var next=current+1;var index=(next+photos.length)%photos.length;overlay.dataset.photoIndex=String(index);var p=photos[index];imgEl.src=p.src;imgEl.alt=p.alt;counterEl.textContent='Фото '+(index+1)+' из '+photos.length;})();"
                            style="width:44px; height:44px; border-radius:999px; border:none; background:rgba(255,255,255,0.12); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            aria-label="Следующее фото"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M6.5 3.5L11.5 9L6.5 14.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            data-photo-close
                            onclick="event && event.stopPropagation && event.stopPropagation();(function(){var overlay=document.getElementById('modelAppPhotoOverlay-{{ $record->id }}');if(!overlay)return;overlay.style.display='none';overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';})();"
                            style="position:absolute; right:0; top:-50px; width:44px; height:44px; border-radius:999px; border:none; background:rgba(255,255,255,0.12); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            aria-label="Закрыть просмотр"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1L13 13M13 1L1 13" stroke="#fff" stroke-width="2" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>

                    <div style="display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.04); border-radius:16px; overflow:hidden;">
                        <img
                            data-photo-main
                            src=""
                            alt="Фото"
                            style="max-width:100%; width:250px; height:auto; object-fit:contain; user-select:none; pointer-events:none;"
                        >
                    </div>
                </div>
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
            <p style="margin: 4px 0 0;"><span style="color: #8f98a8;">Подана:</span> <span style="font-weight: 600; color: #f2f6ff;">{{ \App\Support\DisplayTimezone::format($record->created_at) }}</span></p>
            <p style="margin: 4px 0 0;"><span style="color: #8f98a8;">Обновлена:</span> <span style="font-weight: 600; color: #f2f6ff;">{{ \App\Support\DisplayTimezone::format($record->updated_at) }}</span></p>
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
