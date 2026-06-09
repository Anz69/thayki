import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import ModelCardCarousel from '@/components/ui/ModelCardCarousel'

const SPARKS = [
  { x: 210, y: 24, s: 22 },
  { x: 10, y: 64, s: 15 },
  { x: 26, y: 210, s: 12 },
  { x: 214, y: 190, s: 16 },
]

/**
 * VIP step 2 — the real catalog carousel (ModelCardCarousel) rendered behind a
 * blur + frosted veil with a lock badge: "exclusive profiles, hidden from the
 * public catalog".
 */
export default function VipLockedCards({ isActive }) {
  const haloRef = useRef(null)
  const lockRef = useRef(null)
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(lockRef.current, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const halo = haloRef.current
    const lock = lockRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    gsap.killTweensOf([halo, lock, ...sparks])
    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(lock, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.7, // let the carousel reveal first
      onComplete() {
        idles.push(gsap.to(halo, { scale: 1.12, opacity: 0.7, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(lock, { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.1)
      .to(lock, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2.4)' }, 0.2)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf([halo, lock, ...sparks]) }
  }, [isActive])

  return (
    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
      {/* Constrained, centred stage so the portrait cards stay card-sized
          (the carousel is full-height by default — that made them too long). */}
      <div className="relative w-full" style={{ height: 300, maxWidth: 360 }}>
        {/* The real catalog carousel — the cards themselves are blurred (faces
            stay private), the white card frames stay crisp. */}
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          <ModelCardCarousel isActive={isActive} blur />
        </div>

        {/* glow + sparkles + lock, centred over the stage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative" style={{ width: 240, height: 240 }}>
          <span ref={haloRef} aria-hidden className="absolute rounded-full"
            style={{ left: 45, top: 45, width: 150, height: 150, background: 'radial-gradient(circle, rgba(226,49,155,0.45) 0%, rgba(226,49,155,0) 70%)' }} />
          {SPARKS.map((p, i) => (
            <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
              <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
                <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
              </svg>
            </span>
          ))}
          <div
            ref={lockRef}
            className="absolute rounded-full flex items-center justify-center"
            style={{ left: 91, top: 91, width: 58, height: 58, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 14px 30px rgba(226,49,155,0.55)', border: '3px solid #fff' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.8" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="15" r="1.5" fill="#fff" />
            </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
