import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const SPARKS = [
  { x: 198, y: 28, s: 24 },
  { x: 12, y: 74, s: 16 },
  { x: 30, y: 214, s: 13 },
  { x: 206, y: 190, s: 18 },
  { x: 118, y: 4, s: 12 },
]

export default function VipGemHero({ isActive }) {
  const gemRef = useRef(null)
  const haloRef = useRef(null)
  const ringRef = useRef(null)
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(ringRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(gemRef.current, { autoAlpha: 0, scale: 0.4, rotate: -22, y: 10 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const gem = gemRef.current
    const halo = haloRef.current
    const ring = ringRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [gem, halo, ring, ...sparks]
    gsap.killTweensOf(all)
    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(ring, { autoAlpha: 0, scale: 0.6, rotate: 0 })
    gsap.set(gem, { autoAlpha: 0, scale: 0.4, rotate: -22, y: 10 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.42,
      onComplete() {
        idles.push(gsap.to(gem, { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.12, opacity: 0.7, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(ring, { rotate: 360, duration: 30, ease: 'none', repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(ring, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }, 0.05)
      .to(gem, { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 0.85, ease: 'back.out(1.9)' }, 0.1)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.45)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 240, height: 264 }}>
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 25, top: 40, width: 190, height: 190, background: 'radial-gradient(circle, rgba(226,49,155,0.45) 0%, rgba(155,30,110,0.16) 46%, rgba(226,49,155,0) 72%)' }} />
        <span ref={ringRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 34, top: 49, width: 172, height: 172, border: '1.5px dashed rgba(226,49,155,0.35)' }} />
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}
        <div ref={gemRef} className="absolute" style={{ left: 30, top: 30, width: 180, height: 180, filter: 'drop-shadow(0 20px 38px rgba(226,49,155,0.45))' }}>
          <video
            src="/img/blir.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
