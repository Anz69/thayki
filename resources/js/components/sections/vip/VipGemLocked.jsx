import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import FacetedDiamond from './FacetedDiamond'

const SPARKS = [
  { x: 200, y: 30, s: 22 },
  { x: 14, y: 78, s: 15 },
  { x: 34, y: 208, s: 12 },
  { x: 206, y: 192, s: 16 },
]

export default function VipGemLocked({ isActive }) {
  const gemRef = useRef(null)
  const haloRef = useRef(null)
  const lockRef = useRef(null)
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.4, rotate: 18, y: 10 })
    gsap.set(lockRef.current, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const gem = gemRef.current
    const halo = haloRef.current
    const lock = lockRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [gem, halo, lock, ...sparks]
    gsap.killTweensOf(all)
    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(gem, { autoAlpha: 0, scale: 0.4, rotate: 18, y: 10 })
    gsap.set(lock, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.42,
      onComplete() {
        idles.push(gsap.to(gem, { y: -9, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.12, opacity: 0.7, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(lock, { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(gem, { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 0.85, ease: 'back.out(1.9)' }, 0.08)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.45)
      .to(lock, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2.4)' }, 0.6)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 240, height: 264 }}>
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 35, top: 50, width: 170, height: 170, background: 'radial-gradient(circle, rgba(226,49,155,0.42) 0%, rgba(226,49,155,0) 70%)' }} />
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}
        <div ref={gemRef} className="absolute" style={{ left: 50, top: 52, filter: 'drop-shadow(0 18px 34px rgba(226,49,155,0.42))' }}>
          <FacetedDiamond size={140} />
        </div>
        {/* Lock badge (exclusive / by request) */}
        <div
          ref={lockRef}
          className="absolute z-10 rounded-full flex items-center justify-center"
          style={{ left: 150, top: 150, width: 56, height: 56, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 12px 26px rgba(226,49,155,0.5)', border: '3px solid #fff' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.8" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="15" r="1.5" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  )
}
