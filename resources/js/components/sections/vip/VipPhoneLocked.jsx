import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const SPARKS = [
  { x: 224, y: 34, s: 22 },
  { x: 14, y: 60, s: 14 },
  { x: 28, y: 210, s: 12 },
  { x: 232, y: 196, s: 16 },
]

const Row = () => (
  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#F4F2F6]">
    <span className="size-8 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #F2B8D8, #D98FBC)' }} />
    <span className="flex-1 flex flex-col gap-1.5">
      <span className="h-2 rounded-full bg-[#CFC9D6]" style={{ width: '70%' }} />
      <span className="h-1.5 rounded-full bg-[#E0DCE6]" style={{ width: '45%' }} />
    </span>
  </div>
)

export default function VipPhoneLocked({ isActive }) {
  const phoneRef = useRef(null)
  const haloRef = useRef(null)
  const lockRef = useRef(null)
  const dimRef = useRef(null)
  const rowsRef = useRef([])
  const sparkRefs = useRef([])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(phoneRef.current, { autoAlpha: 0, scale: 0.78, y: 26, rotate: 4 })
    gsap.set(lockRef.current, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(dimRef.current, { autoAlpha: 0 })
    gsap.set(rowsRef.current.filter(Boolean), { autoAlpha: 0, y: 14 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const phone = phoneRef.current
    const halo = haloRef.current
    const lock = lockRef.current
    const dim = dimRef.current
    const rows = rowsRef.current.filter(Boolean)
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [phone, halo, lock, dim, ...rows, ...sparks]
    gsap.killTweensOf(all)

    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    gsap.set(phone, { autoAlpha: 0, scale: 0.78, y: 26, rotate: 4 })
    gsap.set(lock, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(dim, { autoAlpha: 0 })
    gsap.set(rows, { autoAlpha: 0, y: 14 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.45,
      onComplete() {
        idles.push(gsap.to(phone, { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.1, opacity: 0.7, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(lock, { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      .to(phone, { autoAlpha: 1, scale: 1, y: 0, rotate: 0, duration: 0.75, ease: 'back.out(1.7)' }, 0.05)
      .to(rows, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.4)
      .to(dim, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0.6)
      .to(lock, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2.4)' }, 0.66)
      .to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.5)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 260, height: 264 }}>
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 30, top: 30, width: 200, height: 200, background: 'radial-gradient(circle, rgba(226,49,155,0.40) 0%, rgba(226,49,155,0) 70%)' }} />
        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}

        <div ref={phoneRef} className="absolute" style={{ left: 70, top: 16, width: 120, height: 232 }}>
          <div
            className="w-full h-full rounded-[30px] p-[5px] relative"
            style={{ background: 'linear-gradient(155deg, #3A3A42 0%, #1C1C20 60%, #101012 100%)', boxShadow: '0 26px 56px rgba(226,49,155,0.34), inset 0 1px 0 rgba(255,255,255,0.10)' }}
          >
            <div className="w-full h-full rounded-[26px] relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF7FA 100%)' }}>
              <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-12 h-[5px] rounded-full bg-black/15" />

              {/* header line */}
              <div className="absolute left-2.5 top-5 h-2.5 rounded-full bg-[#2A2A2E]" style={{ width: '48%' }} />

              {/* blurred private rows */}
              <div className="absolute left-2.5 right-2.5 top-[40px] flex flex-col gap-2" style={{ filter: 'blur(2.4px)' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} ref={(el) => { rowsRef.current[i] = el }}><Row /></div>
                ))}
              </div>

              {/* dim overlay */}
              <span ref={dimRef} aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 30%, rgba(251,247,250,0.85) 78%)' }} />

              {/* caption */}
              <span className="absolute left-1/2 -translate-x-1/2 bottom-3 px-3 py-1 rounded-full bg-[#F4F2F6] text-[#9A4576] text-[9.5px] font-semibold whitespace-nowrap">
                Только по запросу
              </span>
            </div>
          </div>
        </div>

        {/* Lock badge (centered over the screen) */}
        <div
          ref={lockRef}
          className="absolute z-10 rounded-full flex items-center justify-center"
          style={{ left: 104, top: 104, width: 54, height: 54, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 12px 26px rgba(226,49,155,0.5)', border: '3px solid #fff' }}
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
