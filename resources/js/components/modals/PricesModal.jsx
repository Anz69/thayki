import { useState, useEffect } from 'react'
import ModalSheet from '@/layout/ModalSheet'

/** Available package durations — same labels used during application */
const DURATION_OPTIONS = [
  { hours: 1,  label: '1 час' },
  { hours: 3,  label: '3 часа' },
  { hours: 8,  label: 'Ночь (8 ч)' },
  { hours: 24, label: 'Сутки (24 ч)' },
]

function PriceRow({ opt, value, onChange, onToggle, enabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3.5 bg-[#F5F5F7] rounded-2xl active:bg-[#ECEAEC] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              enabled ? 'border-[#E2319B] bg-[#E2319B]' : 'border-[#D0D0D0] bg-transparent'
            }`}
          >
            {enabled && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-black text-[15px]/[100%] font-medium">{opt.label}</span>
        </div>
        {enabled && (
          <span className="text-[#7F7F7F] text-sm/[100%] font-medium">฿ {value || '—'}</span>
        )}
      </button>

      {enabled && (
        <div className="bg-[#F5F5F7] rounded-2xl px-4 py-3 flex items-center gap-2">
          <span className="text-[#ABABAB] text-sm font-medium shrink-0">฿</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Цена за пакет"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
            className="flex-1 bg-transparent text-black text-sm/[100%] font-medium outline-none placeholder:text-[#C0C0C0]"
          />
        </div>
      )}
    </div>
  )
}

export default function PricesModal({ isOpen, onClose, priceOptions = [], hourlyRate = null, onSave }) {
  // Local state: map hours → { enabled, price }
  const [rows, setRows] = useState({})

  useEffect(() => {
    if (!isOpen) return
    const initial = {}
    DURATION_OPTIONS.forEach(({ hours }) => {
      const existing = priceOptions.find((p) => p.hours === hours)
      initial[hours] = {
        enabled: !!existing,
        price: existing ? String(existing.price_thb) : '',
      }
    })
    // If no price options but there's an hourly rate, pre-fill 1h
    if (Object.values(initial).every((r) => !r.enabled) && hourlyRate) {
      initial[1] = { enabled: true, price: String(hourlyRate) }
    }
    setRows(initial)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRow = (hours) => {
    setRows((prev) => ({
      ...prev,
      [hours]: { ...prev[hours], enabled: !prev[hours]?.enabled, price: prev[hours]?.price ?? '' },
    }))
  }

  const setPrice = (hours, val) => {
    setRows((prev) => ({ ...prev, [hours]: { ...prev[hours], price: val } }))
  }

  // Validate: every enabled row must have a numeric price >= 100
  const enabledRows = DURATION_OPTIONS.filter(({ hours }) => rows[hours]?.enabled)
  const canSave = enabledRows.length > 0 && enabledRows.every(({ hours }) => {
    const n = parseInt(rows[hours]?.price ?? '')
    return !isNaN(n) && n >= 100
  })

  const handleSave = () => {
    if (!canSave) return
    const options = enabledRows.map(({ hours, label }) => ({
      hours,
      price_thb: parseInt(rows[hours].price),
      label,
    }))
    onSave(options)
    onClose()
  }

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="92dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Отмена
        </button>
        <h2 className="text-base/[100%] font-[500] text-black">Цены</h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-3.5 py-2.5 bg-[#EFEEF3] text-sm/[100%] font-medium rounded-full transition-colors ${
            canSave ? 'text-black active:bg-[#E4E4E4]' : 'text-[#ABABAB]'
          }`}
        >
          Готово
        </button>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-10 overflow-y-auto">
        <p className="text-[#7F7F7F] text-[13px]/[148%] font-medium">
          Выберите пакеты и укажите цену для каждого. Клиенты будут видеть эти варианты при бронировании.
        </p>

        {DURATION_OPTIONS.map((opt) => (
          <PriceRow
            key={opt.hours}
            opt={opt}
            value={rows[opt.hours]?.price ?? ''}
            enabled={!!rows[opt.hours]?.enabled}
            onToggle={() => toggleRow(opt.hours)}
            onChange={(v) => setPrice(opt.hours, v)}
          />
        ))}

        <p className="text-[#ABABAB] text-xs/[140%] font-normal px-1 pt-1">
          Минимальная цена — 100 ฿. Нужен хотя бы один пакет.
        </p>
      </div>
    </ModalSheet>
  )
}
