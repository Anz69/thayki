import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const DOTS = [
  { x: 244, y: 26, r: 5 },
  { x: 18, y: 30, r: 3 },
  { x: 8, y: 156, r: 4.5 },
  { x: 256, y: 150, r: 3.5 },
]

// Back-to-front stacked cards: [rotation, x, y, scale, opacity]
const CARDS = [
  { rot: -10, x: -26, y: 14, sc: 0.9, o: 0.55 },
  { rot: 7, x: 22, y: 8, sc: 0.95, o: 0.8 },
  { rot: 0, x: 0, y: 0, sc: 1, o: 1 },
]

const ProfileCard = ({ front }) => (
  <div
    className="w-[176px] h-[104px] rounded-2xl bg-white flex items-center gap-3.5 px-4"
    style={{ boxShadow: '0 14px 34px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.04)' }}
  >
    <div
      className="size-12 rounded-full shrink-0"
      style={{ background: front ? 'linear-gradient(135deg, #F857B0, #C01A7E)' : 'linear-gradient(135deg,#E7E5EC,#D7D5DE)' }}
    />
    <div className="flex-1 flex flex-col gap-2">
      <span className="h-2.5 rounded-full" style={{ width: '72%', background: front ? '#2A2A2E' : '#D7D5DE' }} />
      <span className="h-2 rounded-full bg-[#E2E0E8]" style={{ width: '50%' }} />
      <span className="h-2 rounded-full bg-[#ECEAF1]" style={{ width: '38%' }} />
    </div>
  </div>
)

export default function VipProfiles({ isActive }) {
  const cardRefs = useRef([])
  const lockRef = useRef(null)
  const dotsRef = useRef([])

  useLayoutEffect(() => {
    gsap.set(cardRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0.6, rotate: 0 })
    gsap.set(lockRef.current, { autoAlpha: 0, scale: 0 })
    gsap.set(dotsRef.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const cards = cardRefs.current.filter(Boolean)
    const lock = lockRef.current
    const dots = dotsRef.current.filter(Boolean)
    gsap.killTweensOf([...cards, lock, ...dots])
    cards.forEach((c, i) => gsap.set(c, { autoAlpha: 0, scale: 0.6, rotate: 0, x: 0, y: 0 }))
    gsap.set(lock, { autoAlpha: 0, scale: 0 })
    gsap.set(dots, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.4,
      onComplete() {
        idles.push(gsap.to(cards[cards.length - 1], { y: '-=10', duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        dots.forEach((d, i) => idles.push(gsap.to(d, { scale: 0.3, autoAlpha: 0.3, duration: 0.7 + i * 0.12, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    cards.forEach((c, i) => {
      const cfg = CARDS[i]
      tl.to(c, { autoAlpha: cfg.o, scale: cfg.sc, rotate: cfg.rot, x: cfg.x, y: cfg.y, duration: 0.6, ease: 'back.out(1.5)' }, 0.05 + i * 0.12)
    })
    tl.to(lock, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.6)' }, 0.55)
      .to(dots, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.5)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf([...cards, lock, ...dots]) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 280, height: 200 }}>
        {DOTS.map((p, i) => (
          <span key={i} ref={(el) => { dotsRef.current[i] = el }} className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.r * 2, height: p.r * 2, background: '#E2319B' }} />
        ))}

        {/* Stacked cards (centered) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {CARDS.map((c, i) => (
            <div key={i} ref={(el) => { cardRefs.current[i] = el }} className="absolute" style={{ willChange: 'transform, opacity' }}>
              <ProfileCard front={i === CARDS.length - 1} />
            </div>
          ))}
        </div>

        {/* Lock badge over the front card */}
        <div
          ref={lockRef}
          className="absolute z-10 rounded-full flex items-center justify-center"
          style={{ left: 188, top: 44, width: 50, height: 50, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 10px 22px rgba(226,49,155,0.45)', border: '3px solid #fff' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.8" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="15" r="1.5" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  )
}
