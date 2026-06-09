import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

/* ── White glyphs (centered in the dark medallion) ───────────────────────── */
const Diamond = () => (
  <svg width="58" height="58" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="#fff" strokeWidth="0.9" strokeLinejoin="round" opacity="0.55" />
  </svg>
)
const Lock = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.6" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.4" fill="#fff" />
  </svg>
)
const Shield = () => (
  <svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3l7 2.5v5.2c0 4.4-3 7.6-7 9.3-4-1.7-7-4.9-7-9.3V5.5L12 3Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Person = () => (
  <svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="8" r="3.4" stroke="#fff" strokeWidth="1.6" />
    <path d="M5 20c0-3.5 3.1-5.8 7-5.8s7 2.3 7 5.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const GLYPH = { gem: Diamond, lock: Lock, shield: Shield, person: Person }

const Spark = ({ size, color = '#E2319B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
  </svg>
)

// Sparkles scattered around the medallion (box is 220×220, center ~110).
const SPARKS = [
  { x: 184, y: 22, s: 26 },
  { x: 6, y: 150, s: 16 },
  { x: 30, y: 8, s: 14 },
  { x: 178, y: 168, s: 20 },
  { x: 0, y: 64, s: 12 },
]

export default function VipStep({ isActive, variant = 'gem' }) {
  const ringRef = useRef(null)
  const haloRef = useRef(null)
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
    const halo = haloRef.current
    const ring = ringRef.current
    const gem = gemRef.current
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
        sparks.forEach((s, i) => idles.push(
          gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.18 }),
        ))
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
        {/* soft glow */}
        <span
          ref={haloRef}
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{ left: 20, top: 20, width: 180, height: 180, background: 'radial-gradient(circle, rgba(226,49,155,0.42) 0%, rgba(226,49,155,0) 70%)' }}
        />
        {/* dashed rotating ring */}
        <span
          ref={ringRef}
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{ left: 26, top: 26, width: 168, height: 168, border: '1.5px dashed rgba(226,49,155,0.35)' }}
        />
        {/* sparkles */}
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <Spark size={p.s} />
          </span>
        ))}
        {/* medallion */}
        <div
          ref={gemRef}
          className="absolute rounded-full flex items-center justify-center"
          style={{ left: 50, top: 50, width: 120, height: 120, background: 'linear-gradient(160deg, #2A2A2E 0%, #131315 100%)', boxShadow: '0 18px 44px rgba(226,49,155,0.42)' }}
        >
          <Glyph />
        </div>
      </div>
    </div>
  )
}
