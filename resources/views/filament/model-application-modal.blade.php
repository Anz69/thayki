@php
    $p       = $record->payload ?? [];
    $photos  = $p['photos'] ?? [];
    $prices  = $p['price_options'] ?? [];
    $contact = $p['contact'] ?? [];
@endphp

<div style="padding:4px 0;display:flex;flex-direction:column;gap:20px;">

    {{-- Photos --}}
    @if(!empty($photos))
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Фотографии</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
            @foreach($photos as $photo)
                <a href="{{ $photo }}" target="_blank" style="display:block;width:100px;height:100px;border-radius:10px;overflow:hidden;background:#f3f4f6;flex-shrink:0;">
                    <img src="{{ $photo }}" alt="Фото" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                </a>
            @endforeach
        </div>
    </div>
    @endif

    {{-- Main params --}}
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Параметры</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
            @foreach([
                'Имя/псевдоним'   => $p['display_name'] ?? '—',
                'Возраст'         => isset($p['age']) ? $p['age'].' лет' : '—',
                'Рост'            => isset($p['height_cm']) ? $p['height_cm'].' см' : '—',
                'Вес'             => isset($p['weight_kg']) ? $p['weight_kg'].' кг' : '—',
                'Бюст'            => $p['bust_size'] ?? '—',
                'Ягодицы'         => $p['butt_size'] ?? '—',
                'График'          => $p['schedule'] ?? '—',
                'Ставка в час'    => isset($p['hourly_rate_thb']) ? '฿ '.number_format($p['hourly_rate_thb']) : '—',
            ] as $label => $value)
                <div style="background:#f9fafb;border-radius:8px;padding:8px 12px;">
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">{{ $label }}</p>
                    <p style="font-size:14px;font-weight:600;color:#111827;">{{ $value }}</p>
                </div>
            @endforeach
        </div>
    </div>

    {{-- Description --}}
    @if(!empty($p['description']))
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">О себе</p>
        <div style="background:#f9fafb;border-radius:8px;padding:12px;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">{{ $p['description'] }}</div>
    </div>
    @endif

    {{-- Price options --}}
    @if(!empty($prices))
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Прайс</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
            @foreach($prices as $opt)
                <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border-radius:8px;padding:8px 14px;">
                    <span style="font-size:14px;color:#374151;">{{ $opt['label'] ?? '—' }}
                        @if(!empty($opt['hours']))
                            <span style="font-size:12px;color:#9ca3af;margin-left:4px;">{{ $opt['hours'] }} ч</span>
                        @endif
                    </span>
                    <span style="font-size:14px;font-weight:700;color:#111827;">฿ {{ isset($opt['price_thb']) ? number_format($opt['price_thb']) : '—' }}</span>
                </div>
            @endforeach
        </div>
    </div>
    @endif

    {{-- Contact --}}
    @if(!empty($contact))
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Контакты</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
            @if(!empty($contact['phone']))
                <div style="background:#f9fafb;border-radius:8px;padding:8px 14px;">
                    <span style="font-size:12px;color:#9ca3af;">Телефон: </span>
                    <span style="font-size:14px;color:#374151;">{{ $contact['phone'] }}</span>
                </div>
            @endif
            @if(!empty($contact['telegram']))
                <div style="background:#f9fafb;border-radius:8px;padding:8px 14px;">
                    <span style="font-size:12px;color:#9ca3af;">Telegram: </span>
                    <a href="https://t.me/{{ ltrim($contact['telegram'], '@') }}" target="_blank" style="font-size:14px;color:#3b82f6;">@{{ ltrim($contact['telegram'], '@') }}</a>
                </div>
            @endif
        </div>
    </div>
    @endif

    {{-- Admin note / review --}}
    @if($record->review_note)
    <div>
        <p style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">Заметка администратора</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;font-size:14px;color:#374151;">{{ $record->review_note }}</div>
    </div>
    @endif

</div>
