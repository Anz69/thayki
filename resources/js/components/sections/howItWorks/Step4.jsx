import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const SPARKLES = [
  { dx: -118, dy: -70, r: 4.5 },
  { dx: 116, dy: -54, r: 3.5 },
  { dx: 128, dy: 60, r: 5 },
  { dx: -122, dy: 64, r: 3 },
  { dx: -10, dy: -104, r: 3 },
]

export default function HowItWorksStep4({ isActive }) {
  const cardRef  = useRef(null)
  const badgeRef = useRef(null)
  const pillRef  = useRef(null)
  const dotsRef  = useRef([])

  useLayoutEffect(() => {
    gsap.set(cardRef.current,  { autoAlpha: 0, scale: 0.5, rotate: -8 })
    gsap.set(badgeRef.current, { autoAlpha: 0, scale: 0 })
    gsap.set(pillRef.current,  { autoAlpha: 0, y: 8 })
    gsap.set(dotsRef.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const card  = cardRef.current
    const badge = badgeRef.current
    const pill  = pillRef.current
    const dots  = dotsRef.current.filter(Boolean)

    gsap.killTweensOf([card, badge, pill, ...dots])
    gsap.set(card,  { autoAlpha: 0, scale: 0.5, rotate: -8, y: 0 })
    gsap.set(badge, { autoAlpha: 0, scale: 0 })
    gsap.set(pill,  { autoAlpha: 0, y: 8 })
    gsap.set(dots,  { autoAlpha: 0, scale: 0 })

    const tl = gsap.timeline({
      delay: 0.45,
      onComplete() {
        gsap.to(card, { y: -12, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        dots.forEach((dot, i) => {
          gsap.to(dot, {
            scale: 0.25, autoAlpha: 0.3, duration: 0.6 + i * 0.1,
            ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.22,
          })
        })
      },
    })
    tl.to(card,  { autoAlpha: 1, scale: 1, rotate: -6, duration: 0.7, ease: 'back.out(1.7)' })
    tl.to(pill,  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, '-=0.30')
    tl.to(badge, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.6)' }, '-=0.20')
    tl.to(dots,  { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: 'back.out(2.8)' }, '-=0.25')

    return () => {
      tl.kill()
      gsap.killTweensOf([card, badge, pill, ...dots])
    }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 260, height: 200 }}>
        {SPARKLES.map((s, i) => (
          <div
            key={`sp-${i}`}
            ref={(el) => { dotsRef.current[i] = el }}
            style={{
              position: 'absolute',
              top: 100 + s.dy - s.r,
              left: 130 + s.dx - s.r,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: '50%',
              background: '#E2319B',
              willChange: 'transform, opacity',
            }}
          />
        ))}

        {/* Card */}
        <div
          ref={cardRef}
          className="absolute"
          style={{ left: 40, top: 46, width: 180, height: 112, willChange: 'transform, opacity' }}
        >
          <div
            className="w-full h-full rounded-[18px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #F857B0 0%, #E2319B 60%, #C01A7E 100%)',
              boxShadow: '0 18px 40px rgba(226,49,155,0.35)',
            }}
          >
            {/* chip */}
            <div className="absolute left-4 top-5 w-9 h-7 rounded-[6px] bg-white/85" />
            {/* magnetic stripe shine */}
            <div className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-white/15" />
            {/* number dots */}
            <div className="absolute left-4 bottom-5 flex gap-2 items-center">
              {[0, 1, 2, 3].map((g) => (
                <div key={g} className="flex gap-[3px]">
                  {[0, 1, 2, 3].map((d) => (
                    <span key={d} className="w-[5px] h-[5px] rounded-full bg-white/80" />
                  ))}
                </div>
              ))}
            </div>
            {/* 50% pill */}
            <div
              ref={pillRef}
              className="absolute right-3 top-4 px-2.5 py-1 rounded-full bg-white text-[#E2319B] text-[13px] font-extrabold leading-none"
              style={{ willChange: 'transform, opacity' }}
            >
              50%
            </div>
          </div>
        </div>

        {/* Confirmation badge */}
        <div
          ref={badgeRef}
          className="absolute z-10 rounded-full bg-white flex items-center justify-center"
          style={{
            left: 184, top: 128, width: 52, height: 52,
            boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
            willChange: 'transform, opacity',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#E2319B" />
            <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
