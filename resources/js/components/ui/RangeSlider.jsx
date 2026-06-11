import { useRef, useEffect, useCallback } from 'react'

export default function RangeSlider({ min, max, step = 1, from, to, onChange, format }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)
  const fromRef = useRef(from)
  const toRef = useRef(to)
  fromRef.current = from
  toRef.current = to

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

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const v = valueFromClientX(clientX)
    if (dragging.current === 'from') {
      onChange(Math.min(v, toRef.current), toRef.current)
    } else {
      onChange(fromRef.current, Math.max(v, fromRef.current))
    }
  }, [valueFromClientX, onChange])

  const onUp = useCallback(() => { dragging.current = null }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onMove, onUp])

  const start = (which) => (e) => {
    e.preventDefault()
    dragging.current = which
  }

  const pct = (v) => ((v - min) / (max - min)) * 100
  const fromPct = pct(from)
  const toPct = pct(to)

  const fmt = (v) => (format ? format(v) : v)
  const merged = toPct - fromPct < 16
  const clampPct = (p) => Math.min(94, Math.max(6, p))

  const bubble = (key, p, label) => (
    <div key={key} className="absolute bottom-full mb-2.5 -translate-x-1/2 pointer-events-none" style={{ left: `${clampPct(p)}%` }}>
      <span className="relative block px-2.5 py-1 rounded-lg bg-[#E2319B] text-white text-[12.5px] font-bold tabular-nums whitespace-nowrap shadow-[0_4px_12px_rgba(226,49,155,0.35)]">
        {label}
        <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px size-2 rotate-45 bg-[#E2319B] rounded-[1px]" />
      </span>
    </div>
  )

  return (
    <div className="select-none pt-9">
      <div ref={trackRef} className="relative h-9 touch-none">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-[#EDEAF0]" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#E2319B]"
          style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
        />

        {merged
          ? bubble('m', (fromPct + toPct) / 2, `${fmt(from)} – ${fmt(to)}`)
          : [bubble('f', fromPct, fmt(from)), bubble('t', toPct, fmt(to))]}

        <button
          type="button"
          onPointerDown={start('from')}
          aria-label="from"
          className="absolute top-1/2 -translate-y-1/2 size-6 -ml-3 rounded-full bg-white border-[1.5px] border-[#E2319B] shadow-[0_2px_8px_rgba(226,49,155,0.35)] active:scale-110 transition-transform"
          style={{ left: `${fromPct}%` }}
        />
        <button
          type="button"
          onPointerDown={start('to')}
          aria-label="to"
          className="absolute top-1/2 -translate-y-1/2 size-6 -ml-3 rounded-full bg-white border-[1.5px] border-[#E2319B] shadow-[0_2px_8px_rgba(226,49,155,0.35)] active:scale-110 transition-transform"
          style={{ left: `${toPct}%` }}
        />
      </div>
    </div>
  )
}
