import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useTranslation } from 'react-i18next'
import { searchCities } from '@/data/cities'

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" stroke="#A9A7AE" strokeWidth="1.8" />
    <circle cx="12" cy="10" r="2.5" stroke="#A9A7AE" strokeWidth="1.8" />
  </svg>
)

// Open-Meteo geocoding: free, no key, CORS-enabled, worldwide, localized names.
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const MIN_CHARS = 2 // suggestions only appear after the first letters are typed
const MAX_ITEMS = 8
const GAP = 8

/**
 * Taxi-style city input with an animated suggestion dropdown.
 *
 * Suggestions appear only after typing (≥2 chars) AND when we have matches. A
 * small curated RU/CIS list gives instant results; a debounced Open-Meteo call
 * covers any city in the world with names localized to the active language.
 *
 * Rendering modes:
 *  - default (portal): fixed-positioned dropdown rendered in a portal so it
 *    escapes `overflow:hidden`/transformed ancestors (used on the /request page).
 *  - `inline`: the list lives in-flow right under the input and grows/shrinks
 *    its height smoothly. Pass `overlay` to make that inline list absolutely
 *    positioned (it overlays following content instead of pushing it).
 */
export default function CitySelect({ value, onChange, placeholder, inline = false, overlay = false }) {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'ru').startsWith('en') ? 'en' : 'ru'

  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [remote, setRemote] = useState([])
  const [pos, setPos] = useState(null)

  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const inlineWrapRef = useRef(null)
  const inlineInnerRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  const query = (value || '').trim()

  // Instant local matches (RU/CIS) — shown immediately while remote loads.
  const local = useMemo(() => {
    if (query.length < MIN_CHARS) return []
    return searchCities(query, lang, MAX_ITEMS).map((name) => ({ name }))
  }, [query, lang])

  // Merge local + remote, dedupe by city name, drop an exact match of the value.
  const suggestions = useMemo(() => {
    const seen = new Set()
    const out = []
    const q = query.toLowerCase()
    for (const item of [...local, ...remote]) {
      const key = item.name.toLowerCase()
      if (seen.has(key) || key === q) continue
      seen.add(key)
      out.push(item)
      if (out.length >= MAX_ITEMS) break
    }
    return out
  }, [local, remote, query])

  const showList = open && query.length >= MIN_CHARS && suggestions.length > 0

  // Position the fixed dropdown under (or above) the input, capping its height
  // to the free space so it can scroll instead of overflowing the viewport.
  const updatePosition = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom - GAP * 2
    const spaceAbove = r.top - GAP * 2
    const below = spaceBelow >= 220 || spaceBelow >= spaceAbove
    setPos({
      left: r.left,
      width: r.width,
      below,
      top: below ? r.bottom + GAP : undefined,
      bottom: below ? undefined : window.innerHeight - r.top + GAP,
      maxHeight: Math.max(160, (below ? spaceBelow : spaceAbove)),
    })
  }, [])

  // Debounced worldwide geocoding lookup.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < MIN_CHARS) {
      setRemote([])
      return undefined
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=10&language=${lang}&format=json`
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const results = Array.isArray(data?.results) ? data.results : []
          setRemote(
            results.map((r) => {
              const sub = [r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country]
                .filter(Boolean)
                .join(', ')
              return { name: r.name, sub }
            }),
          )
        })
        .catch(() => { /* aborted / offline — keep local matches */ })
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query, lang])

  // ── Inline mode: grow/shrink the in-flow (or absolute) list height smoothly.
  useEffect(() => {
    if (!inline) return undefined
    const wrap = inlineWrapRef.current
    const innerEl = inlineInnerRef.current
    if (!wrap || !innerEl) return undefined
    gsap.killTweensOf(wrap)
    if (showList) {
      gsap.to(wrap, {
        height: innerEl.offsetHeight,
        opacity: 1,
        duration: 0.34,
        ease: 'power3.out',
      })
    } else {
      gsap.to(wrap, { height: 0, opacity: 0, duration: 0.26, ease: 'power2.in' })
    }
    return undefined
  }, [inline, showList, suggestions, overlay])

  // ── Portal mode below: keep the fixed dropdown anchored while open.
  useEffect(() => {
    if (inline || !showList) return undefined
    updatePosition()
    const onReflow = () => updatePosition()
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    return () => {
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
    }
  }, [inline, showList, suggestions.length, updatePosition])

  // Close on outside click (the portal list lives outside wrapRef).
  useEffect(() => {
    const onDocPointer = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [])

  // Portal mount + enter/exit animation. Keep node mounted through fade-out.
  useEffect(() => {
    if (inline) return undefined
    if (showList) {
      setMounted(true)
      let raf2
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true))
      })
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), 320)
    return () => clearTimeout(t)
  }, [inline, showList])

  useEffect(() => () => {
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  const pick = (item) => {
    onChange(item.name)
    setOpen(false)
    setHighlight(-1)
  }

  const onKeyDown = (e) => {
    if (!showList) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(suggestions[highlight]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const SuggestionRow = (item, i) => (
    <button
      key={`${item.name}-${item.sub || ''}`}
      type="button"
      onMouseEnter={() => setHighlight(i)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => pick(item)}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
      style={{ background: highlight === i ? '#F5F5F7' : 'transparent' }}
    >
      <PinIcon />
      <span className="flex flex-col min-w-0">
        <span className="text-black text-[15px]/[120%] font-medium truncate">{item.name}</span>
        {item.sub && (
          <span className="text-[#9A9A9F] text-[12px]/[120%] truncate">{item.sub}</span>
        )}
      </span>
    </button>
  )

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2.5 bg-[#F5F5F7] rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-[#E2319B]/30 transition-shadow">
        <PinIcon />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-transparent text-black text-[15px] outline-none placeholder:text-[#ABABAB]"
        />
      </div>

      {/* Inline list: in-flow (pushes content, grows the sheet) or absolute
          overlay — both animate their height smoothly. */}
      {inline && (
        <div
          ref={inlineWrapRef}
          style={{
            position: overlay ? 'absolute' : 'relative',
            left: 0,
            right: 0,
            top: overlay ? '100%' : undefined,
            marginTop: GAP,
            zIndex: 40,
            height: 0,
            opacity: 0,
            overflow: 'hidden',
          }}
        >
          <div
            ref={inlineInnerRef}
            className="bg-white rounded-2xl border border-black/5"
            style={{ maxHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {suggestions.map(SuggestionRow)}
          </div>
        </div>
      )}

      {/* Portal list (default for the full page). */}
      {!inline && mounted && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            zIndex: 100050,
            pointerEvents: entered ? 'auto' : 'none',
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0) scale(1)' : `translateY(${pos.below ? -10 : 10}px) scale(0.97)`,
            transformOrigin: pos.below ? 'top center' : 'bottom center',
            transition: 'opacity 0.24s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
            willChange: 'opacity, transform',
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.18)] border border-black/5"
            style={{ maxHeight: '200px', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {suggestions.map(SuggestionRow)}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
