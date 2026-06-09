import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Sparkles around the phone (box 260×260, phone centered).
const SPARKS = [
  { x: 224, y: 34, s: 22 },
  { x: 14, y: 60, s: 14 },
  { x: 28, y: 210, s: 12 },
  { x: 232, y: 196, s: 16 },
]

const Star = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? '#E2319B' : 'none'} aria-hidden>
    <path d="M12 3.2l2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 21.6 6.8 19l1.2-5.8-4.4-4 5.9-.6L12 3.2Z"
      stroke={filled ? '#E2319B' : '#E4CDD9'} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

export default function VipPhoneProfile({ isActive }) {
  const phoneRef = useRef(null)
  const haloRef = useRef(null)
  const ribbonRef = useRef(null)
  const checkRef = useRef(null)
  const rowsRef = useRef([])
  const shineRef = useRef(null)
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(phoneRef.current, { autoAlpha: 0, scale: 0.78, y: 26, rotate: -4 })
    gsap.set(ribbonRef.current, { autoAlpha: 0, x: 30, y: -30 })
    gsap.set(checkRef.current, { autoAlpha: 0, scale: 0 })
    gsap.set(rowsRef.current.filter(Boolean), { autoAlpha: 0, y: 14 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const phone = phoneRef.current
    const halo = haloRef.current
    const ribbon = ribbonRef.current
    const check = checkRef.current
    const shine = shineRef.current
    const rows = rowsRef.current.filter(Boolean)
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [phone, halo, ribbon, check, shine, ...rows, ...sparks]
    gsap.killTweensOf(all)

    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(phone, { autoAlpha: 0, scale: 0.78, y: 26, rotate: -4 })
    gsap.set(ribbon, { autoAlpha: 0, x: 30, y: -30 })
    gsap.set(check, { autoAlpha: 0, scale: 0 })
    gsap.set(rows, { autoAlpha: 0, y: 14 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })
    gsap.set(shine, { autoAlpha: 0, xPercent: -160 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.45,
      onComplete() {
        idles.push(gsap.to(phone, { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.1, opacity: 0.7, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        const sweep = gsap.timeline({ repeat: -1, repeatDelay: 2.6 })
        sweep.fromTo(shine, { xPercent: -160, autoAlpha: 0 }, { xPercent: 220, autoAlpha: 1, duration: 1.0, ease: 'power2.inOut' })
          .to(shine, { autoAlpha: 0, duration: 0.2 }, '-=0.2')
        idles.push(sweep)
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(phone, { autoAlpha: 1, scale: 1, y: 0, rotate: 0, duration: 0.75, ease: 'back.out(1.7)' }, 0.05)
      .to(rows, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.4)
      .to(ribbon, { autoAlpha: 1, x: 0, y: 0, duration: 0.5, ease: 'back.out(1.8)' }, 0.55)
      .to(check, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.8)' }, 0.7)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.5)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 260, height: 264 }}>
        {/* glow */}
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 30, top: 30, width: 200, height: 200, background: 'radial-gradient(circle, rgba(226,49,155,0.40) 0%, rgba(226,49,155,0) 70%)' }} />
        {/* sparkles */}
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}

        {/* Phone */}
        <div ref={phoneRef} className="absolute" style={{ left: 70, top: 16, width: 120, height: 232 }}>
          <div
            className="w-full h-full rounded-[30px] p-[5px] relative"
            style={{ background: 'linear-gradient(155deg, #3A3A42 0%, #1C1C20 60%, #101012 100%)', boxShadow: '0 26px 56px rgba(226,49,155,0.34), inset 0 1px 0 rgba(255,255,255,0.10)' }}
          >
            {/* screen */}
            <div className="w-full h-full rounded-[26px] relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF7FA 100%)' }}>
              {/* notch */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-12 h-[5px] rounded-full bg-black/15" />

              {/* photo block */}
              <div ref={(el) => { rowsRef.current[0] = el }} className="absolute left-2.5 right-2.5 top-5 h-[112px] rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #F7A9D3 0%, #E2319B 55%, #9B1F6E 100%)' }}>
                {/* silhouette */}
                <svg className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[74px] h-[80px]" viewBox="0 0 64 70" fill="rgba(255,255,255,0.30)" aria-hidden>
                  <circle cx="32" cy="22" r="14" />
                  <path d="M6 70c0-15 11.6-24 26-24s26 9 26 24H6Z" />
                </svg>
                {/* VIP ribbon */}
                <div ref={ribbonRef} className="absolute -right-7 top-3 rotate-45 px-7 py-1 text-white text-[10px] font-extrabold tracking-[0.12em] shadow-md"
                  style={{ background: 'linear-gradient(90deg, #F7C948, #E2319B)' }}>
                  VIP
                </div>
              </div>

              {/* name + verified */}
              <div ref={(el) => { rowsRef.current[1] = el }} className="absolute left-2.5 right-2.5 top-[126px] flex items-center gap-1.5">
                <span className="h-2.5 rounded-full bg-[#2A2A2E]" style={{ width: '46%' }} />
                <span ref={checkRef} className="size-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F857B0, #C01A7E)' }}>
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              {/* sub line */}
              <div ref={(el) => { rowsRef.current[2] = el }} className="absolute left-2.5 top-[144px] h-2 rounded-full bg-[#E6E2EA]" style={{ width: '34%' }} />

              {/* rating */}
              <div ref={(el) => { rowsRef.current[3] = el }} className="absolute left-2.5 top-[164px] flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} filled={i < 5} />)}
              </div>

              {/* CTA chip */}
              <div ref={(el) => { rowsRef.current[4] = el }} className="absolute left-2.5 right-2.5 bottom-3 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ background: 'linear-gradient(120deg, #C01A7E, #E2319B)' }}>
                Профиль
              </div>

              {/* light sweep */}
              <span ref={shineRef} aria-hidden className="absolute inset-y-0 left-0 w-1/2 -skew-x-[20deg] pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
