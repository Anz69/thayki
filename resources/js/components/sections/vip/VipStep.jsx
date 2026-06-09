import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

/* ── Glyphs (stroke = currentColor so they work on dark & light) ─────────── */
const Diamond = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" opacity="0.5" />
  </svg>
)
const Lock = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" />
  </svg>
)
const GLYPH = { gem: Diamond, lock: Lock }

const Spark = ({ size, color = '#E2319B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
  </svg>
)

const SPARKS = [
  { x: 186, y: 20, s: 26 },
  { x: 4, y: 150, s: 16 },
  { x: 28, y: 6, s: 14 },
  { x: 176, y: 168, s: 20 },
]

/* ════════════════ Style A — "Glow" (dark medallion + aurora) ════════════ */
function GlowStep({ isActive, variant }) {
  const haloRef = useRef(null)
  const ringRef = useRef(null)
  const gemRef = useRef(null)
  const sparkRefs = useRef([])
  const Glyph = GLYPH[variant] ?? Diamond

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(ringRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.3, rotate: -28 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const halo = haloRef.current, ring = ringRef.current, gem = gemRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    gsap.killTweensOf([halo, ring, gem, ...sparks])
    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(ring, { autoAlpha: 0, scale: 0.6, rotate: 0 })
    gsap.set(gem, { autoAlpha: 0, scale: 0.3, rotate: -28 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })
    const idles = []
    const tl = gsap.timeline({
      delay: 0.4,
      onComplete() {
        idles.push(gsap.to(gem, { y: -10, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.12, opacity: 0.7, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(ring, { rotate: 360, duration: 26, ease: 'none', repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.18 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(ring, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }, 0.05)
      .to(gem, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.8, ease: 'back.out(2)' }, 0.12)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(3)' }, 0.4)
    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf([halo, ring, gem, ...sparks]) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 20, top: 20, width: 180, height: 180, background: 'radial-gradient(circle, rgba(226,49,155,0.45) 0%, rgba(155,40,140,0.18) 45%, rgba(226,49,155,0) 72%)' }} />
        <span ref={ringRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 26, top: 26, width: 168, height: 168, border: '1.5px dashed rgba(226,49,155,0.4)' }} />
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}><Spark size={p.s} /></span>
        ))}
        <div ref={gemRef} className="absolute rounded-full flex items-center justify-center text-white"
          style={{ left: 50, top: 50, width: 120, height: 120, background: 'linear-gradient(160deg, #2A2A2E 0%, #131315 100%)', boxShadow: '0 18px 44px rgba(226,49,155,0.45)' }}>
          <Glyph size={56} />
        </div>
      </div>
    </div>
  )
}

/* ════════════ Style B — "Lux" (minimal outline, calm, editorial) ════════ */
function LuxStep({ isActive, variant }) {
  const r1 = useRef(null)
  const r2 = useRef(null)
  const gemRef = useRef(null)
  const sparkRefs = useRef([])
  const Glyph = GLYPH[variant] ?? Diamond

  useLayoutEffect(() => {
    gsap.set([r1.current, r2.current], { autoAlpha: 0, scale: 0.7 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.6, y: 8 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [r1.current, r2.current, gemRef.current, ...sparks]
    gsap.killTweensOf(all)
    gsap.set([r1.current, r2.current], { autoAlpha: 0, scale: 0.7, rotate: 0 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.6, y: 8 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })
    const idles = []
    const tl = gsap.timeline({
      delay: 0.4,
      onComplete() {
        idles.push(gsap.to(gemRef.current, { y: -5, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(r1.current, { rotate: 360, duration: 40, ease: 'none', repeat: -1 }))
        idles.push(gsap.to(r2.current, { rotate: -360, duration: 32, ease: 'none', repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.5, autoAlpha: 0.4, duration: 1 + i * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.3 })))
      },
    })
    tl.to(r1.current, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0)
      .to(r2.current, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0.08)
      .to(gemRef.current, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.8)' }, 0.18)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(2.6)' }, 0.45)
    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <span ref={r1} aria-hidden className="absolute rounded-full pointer-events-none" style={{ left: 10, top: 10, width: 200, height: 200, border: '1px solid rgba(0,0,0,0.08)' }} />
        <span ref={r2} aria-hidden className="absolute rounded-full pointer-events-none" style={{ left: 40, top: 40, width: 140, height: 140, border: '1px solid rgba(226,49,155,0.30)' }} />
        <span ref={(el) => { sparkRefs.current[0] = el }} className="absolute" style={{ left: 168, top: 40 }}><Spark size={16} /></span>
        <span ref={(el) => { sparkRefs.current[1] = el }} className="absolute" style={{ left: 36, top: 158 }}><Spark size={12} /></span>
        <div ref={gemRef} className="absolute flex items-center justify-center text-[#1A1A1E]" style={{ left: 60, top: 60, width: 100, height: 100 }}>
          <Glyph size={92} />
        </div>
      </div>
    </div>
  )
}

export default function VipStep({ isActive, variant = 'gem', design = 'glow' }) {
  return design === 'lux'
    ? <LuxStep isActive={isActive} variant={variant} />
    : <GlowStep isActive={isActive} variant={variant} />
}
