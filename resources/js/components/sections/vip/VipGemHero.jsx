import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import FacetedDiamond from './FacetedDiamond'

const SPARKS = [
  { x: 196, y: 30, s: 22 },
  { x: 16, y: 78, s: 15 },
  { x: 34, y: 210, s: 12 },
  { x: 204, y: 188, s: 16 },
]

export default function VipGemHero({ isActive }) {
  const gemRef = useRef(null)
  const haloRef = useRef(null)
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.7 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.5, y: 12 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const gem = gemRef.current
    const halo = haloRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [gem, halo, ...sparks]
    gsap.killTweensOf(all)
    gsap.set(halo, { autoAlpha: 0, scale: 0.7 })
    gsap.set(gem, { autoAlpha: 0, scale: 0.5, y: 12 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.42,
      onComplete() {
        idles.push(gsap.to(gem, { y: -9, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.1, opacity: 0.75, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.3, duration: 0.9 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.22 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0)
      .to(gem, { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, 0.1)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(2.6)' }, 0.4)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 240, height: 264 }}>
        {/* soft aura — gentle, fits the gem (no techy ring) */}
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 10, top: 24, width: 220, height: 220, background: 'radial-gradient(circle, rgba(226,49,155,0.34) 0%, rgba(226,49,155,0.12) 42%, rgba(226,49,155,0) 70%)' }} />
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}
        {/* Crisp vector gem — transparent & sharp on every Telegram client
            (transparent video showed a black box on some webviews). */}
        <div ref={gemRef} className="absolute flex items-center justify-center" style={{ left: 30, top: 34, width: 180, height: 180, filter: 'drop-shadow(0 18px 34px rgba(226,49,155,0.40))' }}>
          <FacetedDiamond size={172} />
        </div>
      </div>
    </div>
  )
}
