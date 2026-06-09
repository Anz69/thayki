import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Sparkle dots scattered around the card (box 280×210, card centered).
const DOTS = [
  { x: 232, y: 30, r: 5 },
  { x: 36, y: 22, r: 3 },
  { x: 14, y: 150, r: 4.5 },
  { x: 258, y: 150, r: 3.5 },
  { x: 120, y: 6, r: 3 },
]

export default function VipCard({ isActive }) {
  const cardRef = useRef(null)
  const badgeRef = useRef(null)
  const shineRef = useRef(null)
  const dotsRef = useRef([])

  useLayoutEffect(() => {
    gsap.set(cardRef.current, { autoAlpha: 0, scale: 0.5, rotate: -10 })
    gsap.set(badgeRef.current, { autoAlpha: 0, scale: 0 })
    gsap.set(dotsRef.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const card = cardRef.current
    const badge = badgeRef.current
    const shine = shineRef.current
    const dots = dotsRef.current.filter(Boolean)
    gsap.killTweensOf([card, badge, shine, ...dots])
    gsap.set(card, { autoAlpha: 0, scale: 0.5, rotate: -10, y: 0 })
    gsap.set(badge, { autoAlpha: 0, scale: 0 })
    gsap.set(dots, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.4,
      onComplete() {
        idles.push(gsap.to(card, { y: -12, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        if (shine) {
          const sweep = gsap.timeline({ repeat: -1, repeatDelay: 2.2 })
          sweep.fromTo(shine, { xPercent: -160, autoAlpha: 0 }, { xPercent: 260, autoAlpha: 1, duration: 1.0, ease: 'power2.inOut' })
            .to(shine, { autoAlpha: 0, duration: 0.2 }, '-=0.2')
          idles.push(sweep)
        }
        dots.forEach((d, i) => idles.push(gsap.to(d, { scale: 0.3, autoAlpha: 0.3, duration: 0.7 + i * 0.12, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(card, { autoAlpha: 1, scale: 1, rotate: -6, duration: 0.8, ease: 'back.out(1.7)' }, 0)
      .to(badge, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.6)' }, 0.45)
      .to(dots, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.4)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf([card, badge, shine, ...dots]) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 280, height: 210 }}>
        {DOTS.map((p, i) => (
          <span
            key={i}
            ref={(el) => { dotsRef.current[i] = el }}
            className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.r * 2, height: p.r * 2, background: '#E2319B' }}
          />
        ))}

        {/* Card */}
        <div ref={cardRef} className="absolute" style={{ left: 45, top: 46, width: 190, height: 120 }}>
          <div
            className="w-full h-full rounded-[18px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(150deg, #3A3A42 0%, #202024 48%, #0C0C0E 100%)',
              boxShadow: '0 26px 56px rgba(226,49,155,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* magenta corner glow */}
            <span className="absolute -right-10 -top-12 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(226,49,155,0.55), rgba(226,49,155,0) 70%)' }} />
            {/* top glass highlight */}
            <span className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))' }} />
            {/* diagonal glass streak */}
            <span className="absolute -left-6 top-0 h-full w-16 -skew-x-[18deg] pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.07), rgba(255,255,255,0))' }} />
            {/* diamond watermark */}
            <svg className="absolute right-2 bottom-1 w-20 h-20" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.12 }}>
              <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="#fff" strokeWidth="0.9" strokeLinejoin="round" />
            </svg>
            {/* chip */}
            <div className="absolute left-4 top-4 w-9 h-7 rounded-[6px]" style={{ background: 'linear-gradient(135deg, #F7D9A0, #C9A24B)' }} />
            {/* V.I.P wordmark */}
            <div className="absolute left-4 top-[52px] flex items-center gap-1.5">
              <span className="text-white text-[19px] font-extrabold" style={{ letterSpacing: '0.16em' }}>V.I.P</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E2319B]" />
            </div>
            {/* number dots */}
            <div className="absolute left-4 bottom-4 flex gap-2 items-center">
              {[0, 1, 2, 3].map((g) => (
                <div key={g} className="flex gap-[3px]">
                  {[0, 1, 2, 3].map((d) => (<span key={d} className="w-[5px] h-[5px] rounded-full bg-white/40" />))}
                </div>
              ))}
            </div>
            {/* moving shine */}
            <span ref={shineRef} aria-hidden className="absolute inset-y-0 left-0 w-1/3 -skew-x-[20deg] pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)', opacity: 0 }} />
          </div>
        </div>

        {/* Diamond badge */}
        <div
          ref={badgeRef}
          className="absolute z-10 rounded-full flex items-center justify-center"
          style={{ left: 200, top: 128, width: 54, height: 54, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 10px 22px rgba(226,49,155,0.45)', border: '3px solid #fff' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
