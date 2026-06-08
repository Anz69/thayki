import { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import { projectCity } from './globeProjection'

const PINK_VEC = [0.886, 0.192, 0.608]
const PINK = '#E2319B'
const THETA = 0.22
const ELEVATION = 0.04

// Decorative points spread across the globe (NOT real locations) — polaroids are
// pinned here and rotate with the globe (cobe "Polaroids" vibe). Captioned with
// city names, not model names.
const CITIES = [
  { id: 'moscow', label: 'Moscow',   loc: [55, 37] },
  { id: 'dubai',  label: 'Dubai',    loc: [25, 55] },
  { id: 'paris',  label: 'Paris',    loc: [48, 2] },
  { id: 'ny',     label: 'New York', loc: [40, -74] },
  { id: 'tokyo',  label: 'Tokyo',    loc: [35, 139] },
  { id: 'phuket', label: 'Phuket',   loc: [8, 98] },
]

const MARKERS = CITIES.map((c) => ({ location: c.loc, size: 0.045 }))

const RING_TEXT = (Array(3).fill('RUS-MODEL MODEL AGENCY').join(' • ') + ' • ').split('')
const RING_N = RING_TEXT.length
const RING_RADIUS = 0.43
const RING_TILT_DEG = 62

function frontOpacity(depth) {
  if (depth <= 0.04) return 0
  if (depth >= 0.28) return 1
  return (depth - 0.04) / 0.24
}

export default function Globe({ className = '', style }) {
  const wrapRef   = useRef(null)
  const canvasRef = useRef(null)
  const polRefs   = useRef({})

  const ringRefs = useRef([])
  const ringWrapRef  = useRef(null)
  const ringPlaneRef = useRef(null)

  const pointerInteracting = useRef(null)
  const pointerMovement    = useRef(0)
  const rotation           = useRef(0)

  // Catalog photos, one paired to each city polaroid.
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    let cancelled = false
    api.get('/catalog/models', { params: { per_page: 24 } })
      .then((r) => {
        if (cancelled) return
        const list = (r?.data?.data ?? [])
          .filter((m) => m.photos?.[0]?.url)
          .map((m) => ({ photo: resolveMediaUrl(m.photos[0].url), name: modelName(m) }))
        setPhotos(list)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let width = 0
    let phi = 0
    const onResize = () => {
      const w = canvas.offsetWidth
      if (w > 0) width = w
    }
    onResize()
    window.addEventListener('resize', onResize)

    let lastT = -1
    const onVisible = () => {
      if (document.visibilityState === 'visible') { onResize(); lastT = -1 }
    }
    document.addEventListener('visibilitychange', onVisible)

    const isMobile = window.matchMedia?.('(pointer: coarse)')?.matches
      || Math.min(window.innerWidth, window.innerHeight) < 600
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5)

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: 0,
      theta: THETA,
      dark: 0,
      diffuse: 1.2,
      scale: 1,
      mapSamples: 8000,
      mapBrightness: 5.6,
      baseColor: [0.92, 0.92, 0.95],
      markerColor: PINK_VEC,
      glowColor: [1, 1, 1],
      markers: MARKERS,
      markerElevation: ELEVATION,
      opacity: 0.92,
    })

    let frame
    let faded = false
    let ringAngle = 0
    const STEP = (2 * Math.PI) / RING_N
    let ringW = -1
    const ringLastOp = new Float32Array(RING_N).fill(-1)
    // Cache per-polaroid writes (skip identical frames).
    const polCache = new Map()
    const writePol = (el, id, op, px, py, scale) => {
      let c = polCache.get(id)
      if (!c) { c = { op: -1, x: NaN, y: NaN, s: -1 }; polCache.set(id, c) }
      const ro = Math.round(op * 100) / 100
      if (Math.abs(ro - c.op) >= 0.02) { el.style.opacity = ro; c.op = ro }
      if (ro <= 0) return
      const x = Math.round(px)
      const y = Math.round(py)
      const s = Math.round(scale * 100) / 100
      if (x !== c.x || y !== c.y || s !== c.s) {
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${s})`
        c.x = x; c.y = y; c.s = s
      }
    }

    const render = (t) => {
      frame = requestAnimationFrame(render)

      const dt = lastT < 0 ? 1 : Math.min((t - lastT) / (1000 / 60), 3)
      lastT = t

      if (pointerInteracting.current === null) phi += 0.004 * dt
      ringAngle -= 0.0026 * dt
      const effPhi = phi + rotation.current
      globe.update({ phi: effPhi, width: width * dpr, height: width * dpr })

      const w = width

      if (ringPlaneRef.current && w !== ringW) {
        ringW = w
        if (ringWrapRef.current) ringWrapRef.current.style.perspective = `${(w * 2.8).toFixed(0)}px`
        const R = RING_RADIUS * w
        for (let i = 0; i < RING_N; i++) {
          const el = ringRefs.current[i]
          if (!el) continue
          const angDeg = (i * STEP * 180) / Math.PI
          el.style.transform = `translate(-50%, -50%) rotate(${(-angDeg).toFixed(2)}deg) translateY(${R.toFixed(1)}px)`
        }
      }

      if (ringPlaneRef.current) {
        const spinDeg = (ringAngle * 180) / Math.PI
        ringPlaneRef.current.style.transform = `rotateX(${RING_TILT_DEG}deg) rotateZ(${spinDeg.toFixed(2)}deg)`
      }

      for (let i = 0; i < RING_N; i++) {
        const el = ringRefs.current[i]
        if (!el) continue
        const eff = ringAngle - i * STEP
        const tt = (1 + Math.cos(eff)) / 2
        const op = Math.round((0.1 + 0.9 * Math.pow(tt, 0.85)) * 1000) / 1000
        if (Math.abs(op - ringLastOp[i]) >= 0.003) { el.style.opacity = op; ringLastOp[i] = op }
      }

      // Pin polaroids to their cities (depth → fade + perspective scale).
      for (const c of CITIES) {
        const el = polRefs.current[c.id]
        if (!el) continue
        const p = projectCity(c.loc[0], c.loc[1], effPhi, THETA, ELEVATION + 0.02)
        const scale = 0.66 + 0.34 * Math.max(0, Math.min(1, (p.depth - 0.04) / 0.5))
        writePol(el, c.id, frontOpacity(p.depth), p.x * w, p.y * w, scale)
      }

      if (!faded && canvasRef.current) { faded = true; canvasRef.current.style.opacity = '1' }
    }
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      globe.destroy()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const onPointerDown = (e) => {
    pointerInteracting.current = e.clientX - pointerMovement.current
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
  }
  const endInteraction = () => {
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
  }
  const onMove = (clientX) => {
    if (pointerInteracting.current === null) return
    const delta = clientX - pointerInteracting.current
    pointerMovement.current = delta
    rotation.current = delta / 180
  }

  return (
    <div ref={wrapRef} className={className} style={style}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerUp={endInteraction}
        onPointerOut={endInteraction}
        onMouseMove={(e) => onMove(e.clientX)}
        onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1s ease',
          contain: 'layout paint size',
          touchAction: 'pan-y',
        }}
      />

      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute inset-0" style={{ transform: 'translateY(-3%)' }}>
          <div ref={ringWrapRef} className="absolute inset-0" style={{ perspective: '1000px' }}>
            <div
              ref={ringPlaneRef}
              className="absolute inset-0"
              style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
            >
              {RING_TEXT.map((ch, i) => (
                <span
                  key={`ring-${i}`}
                  ref={(el) => { ringRefs.current[i] = el }}
                  className="absolute left-1/2 top-1/2 font-semibold uppercase"
                  style={{
                    opacity: 0,
                    color: PINK,
                    fontSize: 'clamp(9px, 2.3vw, 13px)',
                    letterSpacing: '1.5px',
                    lineHeight: 1,
                    whiteSpace: 'pre',
                    textShadow: '0 1px 6px rgba(226,49,155,0.18)',
                    willChange: 'opacity',
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Polaroid photo cards pinned to cities */}
        {CITIES.map((c, i) => {
          const p = photos.length ? photos[i % photos.length] : null
          if (!p) return null
          return (
            <div
              key={c.id}
              ref={(el) => { polRefs.current[c.id] = el }}
              className="absolute left-0 top-0"
              style={{ opacity: 0, willChange: 'transform, opacity', width: 'clamp(54px, 14%, 84px)' }}
            >
              <div className="bg-white rounded-[12px] p-1 pb-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.20)]">
                <div className="w-full aspect-[3/4] rounded-[8px] overflow-hidden bg-[#EFEAEE]">
                  <img src={p.photo} alt="" className="w-full h-full object-cover object-top" draggable={false} loading="lazy" />
                </div>
                <div className="px-0.5 pt-1 pb-0.5">
                  <p className="text-black text-[10px] font-semibold leading-none truncate">📍 {c.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
