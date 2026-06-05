import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { projectCity, projectArcMid } from './globeProjection'

const PINK_VEC = [0.886, 0.192, 0.608] // #E2319B in cobe 0..1 RGB
const PINK = '#E2319B'
const THETA = 0.22
const ELEVATION = 0.04

// World capitals — [lat, lng], deliberately spread far apart in longitude AND
// latitude so their labels rarely cluster on screen.
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

// Orbit text — a real 3D ring. The chars are laid on a flat circle inside a
// plane that is tilted with rotateX under CSS perspective, so the text actually
// lies on the ring (far/top side recedes & shrinks) instead of facing the
// screen. The plane spins via rotateZ; per-char opacity softly dims the back.
const RING_TEXT = (Array(3).fill('RUS-MODEL MODEL AGENCY').join('   •   ') + '   •   ').split('')
const RING_N = RING_TEXT.length
const RING_RADIUS = 0.43          // fraction of the box (sits just inside the globe rim)
const RING_TILT_DEG = 62          // 3D tilt of the ring plane so the text lies down

// City/route labels only become visible once well toward the front of the
// globe, so edge cities fade out and labels don't overlap.
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
      {/* static halo — no infinite animation (11 of them tanked FPS) */}
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

/**
 * COBE WebGL globe with DOM city/route labels anchored to their real projected
 * positions (cobe's own math, see ./globeProjection). Auto-rotates; draggable.
 */
export default function Globe({ className = '', style }) {
  const wrapRef   = useRef(null)
  const canvasRef = useRef(null)
  const labelRefs = useRef({}) // id → outer label element

  const ringRefs = useRef([])
  const ringWrapRef  = useRef(null) // perspective container
  const ringPlaneRef = useRef(null) // tilted + spinning plane (preserve-3d)

  const pointerInteracting = useRef(null)
  const pointerMovement    = useRef(0)
  const rotation           = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let width = 0
    let phi = 0
    const onResize = () => { width = canvas.offsetWidth }
    onResize()
    window.addEventListener('resize', onResize)

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

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
    const FRAME_MS = 1000 / 30 // cap the heavy WebGL redraw at ~30fps
    const STEP = (2 * Math.PI) / RING_N
    let ringW = -1
    const render = (t) => {
      frame = requestAnimationFrame(render)
      if (lastT >= 0 && t - lastT < FRAME_MS) return // skip frame
      lastT = t

      if (pointerInteracting.current === null) phi += 0.011 // faster auto-spin (per 30fps frame)
      ringAngle += 0.006
      const effPhi = phi + rotation.current
      globe.update({ phi: effPhi, width: width * dpr, height: width * dpr })

      const w = width

      // (Re)lay the chars on a flat circle when the box size changes; scale the
      // perspective with the box so the 3D look is consistent at any size.
      if (ringPlaneRef.current && w !== ringW) {
        ringW = w
        if (ringWrapRef.current) ringWrapRef.current.style.perspective = `${(w * 1.05).toFixed(0)}px`
        const R = RING_RADIUS * w
        for (let i = 0; i < RING_N; i++) {
          const el = ringRefs.current[i]
          if (!el) continue
          // rotate(-angle) translateY(R): char sits on the circle starting from
          // the bottom (front) reading left→right, baseline tangent to the ring.
          const angDeg = (i * STEP * 180) / Math.PI
          el.style.transform = `translate(-50%, -50%) rotate(${(-angDeg).toFixed(2)}deg) translateY(${R.toFixed(1)}px)`
        }
      }

      // Tilt + spin the whole ring plane in 3D — the chars lie on it.
      if (ringPlaneRef.current) {
        const spinDeg = (ringAngle * 180) / Math.PI
        ringPlaneRef.current.style.transform = `rotateX(${RING_TILT_DEG}deg) rotateZ(${spinDeg.toFixed(2)}deg)`
      }

      // Soft depth fade: bright in front (bottom), gently dimming only near the
      // very back (top) so the ring stays readable around the sides.
      for (let i = 0; i < RING_N; i++) {
        const el = ringRefs.current[i]
        if (!el) continue
        const eff = ringAngle - i * STEP
        const tt = (1 + Math.cos(eff)) / 2 // 1 front (bottom) .. 0 back (top)
        const fade = Math.pow(tt, 0.4)     // stays high, drops only near the back
        el.style.opacity = (0.3 + 0.7 * fade).toFixed(3)
      }
      // Anchor city labels — position via transform (no per-frame layout).
      for (const c of CITIES) {
        const el = labelRefs.current[c.id]
        if (!el) continue
        const p = projectCity(c.loc[0], c.loc[1], effPhi, THETA, ELEVATION)
        const op = frontOpacity(p.depth)
        el.style.opacity = op.toFixed(3)
        if (op <= 0) continue
        el.style.transform = `translate3d(${(p.x * w).toFixed(1)}px, ${(p.y * w).toFixed(1)}px, 0)`
      }
      // Anchor route labels to arc peaks
      for (const a of ARCS) {
        if (!a.label) continue
        const el = labelRefs.current[a.id]
        if (!el) continue
        const p = projectArcMid(a.from, a.to, effPhi, THETA, 0.42, ELEVATION)
        const op = frontOpacity(p.depth)
        el.style.opacity = op.toFixed(3)
        if (op <= 0) continue
        el.style.transform = `translate3d(${(p.x * w).toFixed(1)}px, ${(p.y * w).toFixed(1)}px, 0)`
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

      {/* City + route labels, positioned every frame by the render loop */}
      <div className="absolute inset-0 pointer-events-none select-none">

        {/* Tilted 3D orbit text */}
        {RING_TEXT.map((ch, i) => (
          <span
            key={`ring-${i}`}
            ref={(el) => { ringRefs.current[i] = el }}
            className="absolute font-semibold uppercase"
            style={{
              left: 0,
              top: 0,
              opacity: 0,
              color: PINK,
              fontSize: 'clamp(8px, 2vw, 11.5px)',
              letterSpacing: '2px',
              lineHeight: 1,
              textShadow: '0 1px 6px rgba(226,49,155,0.18)',
              willChange: 'transform, opacity',
              // 3D tilt
              transform: 'perspective(20px) rotateX(60deg) rotateZ(-60deg)',
            }}
          >
  
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}

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
