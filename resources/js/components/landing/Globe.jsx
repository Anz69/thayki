import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { projectCity, projectArcMid } from './globeProjection'

const PINK_VEC = [0.886, 0.192, 0.608]
const PINK = '#E2319B'
const THETA = 0.22
const ELEVATION = 0.04

const C = {
  moscow:    [55.7558, 37.6173],
  london:    [51.5074, -0.1278],
  washington:[38.9072, -77.0369],
  brasilia:  [-15.7939, -47.8828],
  buenos:    [-34.6037, -58.3816],
  tokyo:     [35.6762, 139.6503],
  beijing:   [39.9042, 116.4074],
  delhi:     [28.6139, 77.2090],
  cairo:     [30.0444, 31.2357],
  capetown:  [-33.9249, 18.4241],
  canberra:  [-35.2809, 149.1300],
}

const CITIES = [
  { id: 'moscow',     label: 'Moscow',       loc: C.moscow,     size: 0.05 },
  { id: 'london',     label: 'London',       loc: C.london,     size: 0.05 },
  { id: 'washington', label: 'Washington',   loc: C.washington, size: 0.05 },
  { id: 'brasilia',   label: 'Brasília',     loc: C.brasilia,   size: 0.05 },
  { id: 'buenos',     label: 'Buenos Aires', loc: C.buenos,     size: 0.05 },
  { id: 'tokyo',      label: 'Tokyo',        loc: C.tokyo,      size: 0.05 },
  { id: 'beijing',    label: 'Beijing',      loc: C.beijing,    size: 0.05 },
  { id: 'delhi',      label: 'New Delhi',    loc: C.delhi,      size: 0.05 },
  { id: 'cairo',      label: 'Cairo',        loc: C.cairo,      size: 0.05 },
  { id: 'capetown',   label: 'Cape Town',    loc: C.capetown,   size: 0.05 },
  { id: 'canberra',   label: 'Canberra',     loc: C.canberra,   size: 0.05 },
]

const ARCS = [
  { id: 'msk-tokyo', from: C.moscow, to: C.tokyo, label: 'Moscow → Tokyo' },
]

const MARKERS = CITIES.map((c) => ({ location: c.loc, size: c.size }))
const COBE_ARCS = ARCS.map((a) => ({ from: a.from, to: a.to }))

const RING_TEXT = (Array(3).fill('RUS-MODEL MODEL AGENCY').join(' • ') + ' • ').split('')
const RING_N = RING_TEXT.length
const RING_RADIUS = 0.43
const RING_TILT_DEG = 62

function frontOpacity(depth) {
  if (depth <= 0.05) return 0
  if (depth >= 0.3) return 1
  return (depth - 0.05) / 0.25
}

function MarkerDot() {
  return (
    <span
      className="absolute"
      style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)', width: 12, height: 12 }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: PINK, opacity: 0.22 }}
      />
      <span
        className="absolute rounded-full"
        style={{ left: 3, top: 3, width: 6, height: 6, background: 'rgba(255,255,255,0.95)' }}
      />
      <span
        className="absolute rounded-full"
        style={{ left: 4, top: 4, width: 4, height: 4, background: PINK, boxShadow: `0 0 8px ${PINK}` }}
      />
    </span>
  )
}

export default function Globe({ className = '', style }) {
  const wrapRef   = useRef(null)
  const canvasRef = useRef(null)
  const labelRefs = useRef({})

  const ringRefs = useRef([])
  const ringWrapRef  = useRef(null)
  const ringPlaneRef = useRef(null)

  const pointerInteracting = useRef(null)
  const pointerMovement    = useRef(0)
  const rotation           = useRef(0)

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

    // When the mini-app is minimized & reopened the rAF loop pauses and the
    // canvas can be re-measured as 0; re-measure on resume and reset timing so
    // the rotation doesn't snap forward by the whole backgrounded interval.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        onResize()
        lastT = -1
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    // Cap the render resolution hard on phones — drawing the globe at the
    // device's full 2–3× DPR is the main source of mobile jank. Desktops keep
    // the crisper 1.5×.
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
      arcs: COBE_ARCS,
      arcColor: PINK_VEC,
      arcWidth: 0.45,
      arcHeight: 0.28,
      markerElevation: ELEVATION,
      opacity: 0.92,
    })

    let frame
    let faded = false
    let lastT = -1
    let ringAngle = 0
    const STEP = (2 * Math.PI) / RING_N
    let ringW = -1
    // Per-frame DOM writes are the main cost here (70 ring chars + 11 labels).
    // Cache last-written values and skip writes that wouldn't change anything —
    // identical visuals, far fewer style mutations & string allocations.
    const ringLastOp = new Float32Array(RING_N).fill(-1)
    const labelCache = new Map()
    const writeLabel = (el, id, op, px, py) => {
      let c = labelCache.get(id)
      if (!c) { c = { op: -1, x: NaN, y: NaN }; labelCache.set(id, c) }
      const ro = Math.round(op * 1000) / 1000
      if (Math.abs(ro - c.op) >= 0.003) { el.style.opacity = ro; c.op = ro }
      if (ro <= 0) return
      const x = Math.round(px * 10) / 10
      const y = Math.round(py * 10) / 10
      if (x !== c.x || y !== c.y) {
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        c.x = x; c.y = y
      }
    }
    const render = (t) => {
      frame = requestAnimationFrame(render)

      // Frame-rate independent advance (normalised to a 60fps baseline) so the
      // motion is buttery smooth on 60/120Hz alike and never speeds up/snaps.
      const dt = lastT < 0 ? 1 : Math.min((t - lastT) / (1000 / 60), 3)
      lastT = t

      // Slower, calmer spin (closer to cobe.vercel.app). Ring turns the same
      // way as the globe (rightwards) — negative advance.
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
        if (Math.abs(op - ringLastOp[i]) >= 0.003) {
          el.style.opacity = op
          ringLastOp[i] = op
        }
      }
      for (const c of CITIES) {
        const el = labelRefs.current[c.id]
        if (!el) continue
        const p = projectCity(c.loc[0], c.loc[1], effPhi, THETA, ELEVATION)
        writeLabel(el, c.id, frontOpacity(p.depth), p.x * w, p.y * w)
      }
      for (const a of ARCS) {
        if (!a.label) continue
        const el = labelRefs.current[a.id]
        if (!el) continue
        const p = projectArcMid(a.from, a.to, effPhi, THETA, 0.42, ELEVATION)
        writeLabel(el, a.id, frontOpacity(p.depth), p.x * w, p.y * w)
      }

      if (!faded && canvasRef.current) {
        faded = true
        canvasRef.current.style.opacity = '1'
      }
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
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </div>
        </div>
        </div>

        {CITIES.map((c) => (
          <div
            key={c.id}
            ref={(el) => { labelRefs.current[c.id] = el }}
            className="absolute"
            style={{ left: 0, top: 0, opacity: 0, transition: 'opacity 0.25s linear', willChange: 'transform, opacity' }}
          >
            <MarkerDot />
            <span
              className="absolute rounded-md text-white text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap px-2.5 py-1"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, calc(-50% - 16px))',
                background: PINK,
                boxShadow: '0 6px 16px rgba(226,49,155,0.28)',
              }}
            >
              {c.label}
            </span>
          </div>
        ))}

        {ARCS.filter((a) => a.label).map((a) => (
          <div
            key={a.id}
            ref={(el) => { labelRefs.current[a.id] = el }}
            className="absolute"
            style={{ left: 0, top: 0, opacity: 0, transition: 'opacity 0.25s linear', willChange: 'transform, opacity' }}
          >
            <span
              className="absolute rounded-md text-[9px] font-medium uppercase tracking-wider whitespace-nowrap px-2 py-1"
              style={{
                top: 0,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: PINK,
                background: 'rgba(255,255,255,0.92)',
                border: `1px solid ${PINK}40`,
              }}
            >
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
