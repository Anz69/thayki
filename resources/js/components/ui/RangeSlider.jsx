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

  return (
    <div className="select-none">
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FCEFF7] text-[#E2319B] text-[14px] font-bold tabular-nums whitespace-nowrap">
          {format ? format(from) : from}
          <span className="text-[#E2319B]/35 font-medium">–</span>
          {format ? format(to) : to}
        </span>
      </div>
      <div ref={trackRef} className="relative h-9 touch-none">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-[#EDEAF0]" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#E2319B]"
          style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
        />
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
