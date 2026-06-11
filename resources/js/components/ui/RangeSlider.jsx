import { useRef, useState, useEffect, useCallback } from 'react'

export default function RangeSlider({ min, max, step = 1, from, to, value, onChange, format, single = false }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)
  const fromRef = useRef(0)
  const toRef = useRef(0)
  fromRef.current = single ? min : from
  toRef.current = single ? value : to

  const [active, setActive] = useState(null)

  const clampSnap = useCallback((v) => {
    const snapped = Math.round((v - min) / step) * step + min
    return Math.min(max, Math.max(min, snapped))
  }, [min, max, step])

  const valueFromClientX = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return min
    const rect = el.getBoundingClientRect()
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    return clampSnap(min + ratio * (max - min))
  }, [clampSnap, min, max])

  const apply = useCallback((which, v) => {
    if (single) { onChange(v); return }
    if (which === 'from') onChange(Math.min(v, toRef.current), toRef.current)
    else onChange(fromRef.current, Math.max(v, fromRef.current))
  }, [onChange, single])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    if (e.cancelable) e.preventDefault()
    const v = valueFromClientX(e.clientX)
    if (dragging.current === 'auto') {
      if (v === toRef.current) return
      const which = v < toRef.current ? 'from' : 'to'
      dragging.current = which
      setActive(which)
    }
    apply(dragging.current, v)
  }, [apply, valueFromClientX])

  const onUp = useCallback(() => {
    dragging.current = null
    setActive(null)
    try { window.Telegram?.WebApp?.enableVerticalSwipes?.() } catch {}
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onMove, onUp])

  const onTrackDown = (e) => {
    e.preventDefault()
    try { window.Telegram?.WebApp?.disableVerticalSwipes?.() } catch {}
    const v = valueFromClientX(e.clientX)
    let which = 'to'
    if (!single) {
      if (fromRef.current === toRef.current) {
        which = 'auto'
      } else {
        which = Math.abs(v - fromRef.current) < Math.abs(v - toRef.current) ? 'from' : 'to'
      }
    }
    dragging.current = which
    if (which !== 'auto') {
      setActive(which)
      apply(which, v)
    } else {
      setActive(null)
    }
  }

  const lo = fromRef.current
  const hi = toRef.current
  const pct = (v) => ((v - min) / (max - min)) * 100
  const fromPct = pct(lo)
  const toPct = pct(hi)
  const fmt = (v) => (format ? format(v) : v)
  const merged = !single && toPct - fromPct < 16
  const clampPct = (p) => Math.min(94, Math.max(6, p))
  const ease = active ? 'transition-none' : 'transition-[left,right,width] duration-300 ease-out'

  const label = (key, p, text, on) => (
    <div
      key={key}
      className={`absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none transition-all duration-200 ease-out ${on ? '-translate-y-1 scale-110' : ''} ${active ? '' : 'transition-[left] duration-300'}`}
      style={{ left: `${clampPct(p)}%` }}
    >
      <span className={`block px-2.5 py-1 rounded-lg text-[12.5px] font-bold tabular-nums whitespace-nowrap transition-colors duration-200 ${on ? 'bg-[#E2319B] text-white shadow-[0_6px_16px_rgba(226,49,155,0.45)]' : 'bg-[#FCEFF7] text-[#E2319B]'}`}>
        {text}
      </span>
    </div>
  )

  const knob = (which, p) => {
    const on = active === which
    return (
      <div
        key={which}
        className={`absolute top-1/2 size-7 touch-none ${active ? 'transition-none' : 'transition-[left,transform] duration-300 ease-out'}`}
        style={{ left: `${p}%`, transform: `translate(${-p}%, -50%)` }}
      >
        <span className={`absolute inset-0 -m-1.5 rounded-full bg-[#E2319B]/20 transition-all duration-300 ease-out ${on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
        <span className={`absolute inset-0 rounded-full bg-white border-2 border-[#E2319B] transition-transform duration-200 ease-out ${on ? 'scale-110 shadow-[0_4px_14px_rgba(226,49,155,0.5)]' : 'shadow-[0_2px_8px_rgba(226,49,155,0.3)]'}`} />
      </div>
    )
  }

  return (
    <div className="select-none pt-10 touch-none">
      <div
        ref={trackRef}
        onPointerDown={onTrackDown}
        className="relative h-9 touch-none cursor-pointer"
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-[#EDEAF0]" />

        <div
          className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#E2319B] overflow-hidden ${ease}`}
          style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
        >
          <span
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              backgroundSize: '200% 100%',
              animation: 'card-shimmer 2.4s linear infinite',
            }}
          />
        </div>

        {single
          ? label('v', toPct, fmt(hi), active === 'to')
          : merged
            ? label('m', 50, lo === hi ? `${fmt(lo)}` : `${fmt(lo)} – ${fmt(hi)}`, !!active)
            : [label('f', fromPct, fmt(lo), active === 'from'), label('t', toPct, fmt(hi), active === 'to')]}

        {!single && knob('from', fromPct)}
        {knob('to', toPct)}
      </div>
    </div>
  )
}
