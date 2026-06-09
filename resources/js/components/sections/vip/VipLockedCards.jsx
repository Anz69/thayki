import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'

const FALLBACK = ['/img/girls/big/2.png', '/img/girls/big/3.png', '/img/girls/big/5.png']

// Fanned stack: back-left, back-right, front. CSS sets left/top; GSAP animates
// transform (rotate/scale/x) so they fan out from the centre.
const CARDS = [
  { left: 22, top: 44, rot: -11, scale: 0.9, o: 0.85, z: 1 },
  { left: 90, top: 44, rot: 11, scale: 0.9, o: 0.85, z: 1 },
  { left: 56, top: 30, rot: 0, scale: 1, o: 1, z: 2 },
]
const CENTER_LEFT = 56
const SPARKS = [
  { x: 204, y: 26, s: 22 },
  { x: 10, y: 70, s: 15 },
  { x: 30, y: 214, s: 12 },
  { x: 208, y: 196, s: 16 },
]

export default function VipLockedCards({ isActive }) {
  const haloRef = useRef(null)
  const cardRefs = useRef([])
  const lockRef = useRef(null)
  const sparkRefs = useRef([])
  const [photos, setPhotos] = useState(FALLBACK)

  useEffect(() => {
    let cancelled = false
    api.get('/catalog/models', { params: { per_page: 3 } })
      .then((r) => {
        if (cancelled) return
        const list = (r?.data?.data ?? [])
          .map((m) => {
            const ph = Array.isArray(m.photos) ? m.photos.filter(Boolean) : []
            const main = ph.find((p) => p?.is_main) ?? ph[0]
            return main?.url ? resolveMediaUrl(main.url) : null
          })
          .filter(Boolean)
        if (list.length >= 3) setPhotos(list.slice(0, 3))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useLayoutEffect(() => {
    gsap.set(haloRef.current, { autoAlpha: 0, scale: 0.6 })
    gsap.set(cardRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0.5, rotate: 0 })
    gsap.set(lockRef.current, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparkRefs.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])

  useEffect(() => {
    if (!isActive) return undefined
    const halo = haloRef.current
    const cards = cardRefs.current.filter(Boolean)
    const lock = lockRef.current
    const sparks = sparkRefs.current.filter(Boolean)
    const all = [halo, ...cards, lock, ...sparks]
    gsap.killTweensOf(all)
    gsap.set(halo, { autoAlpha: 0, scale: 0.6 })
    cards.forEach((c, i) => gsap.set(c, { autoAlpha: 0, scale: 0.5, rotate: 0, x: CENTER_LEFT - CARDS[i].left, y: 14 }))
    gsap.set(lock, { autoAlpha: 0, scale: 0, y: -16 })
    gsap.set(sparks, { autoAlpha: 0, scale: 0 })

    const idles = []
    const tl = gsap.timeline({
      delay: 0.42,
      onComplete() {
        idles.push(gsap.to(cards[2], { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(halo, { scale: 1.12, opacity: 0.7, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        idles.push(gsap.to(lock, { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
        sparks.forEach((s, i) => idles.push(gsap.to(s, { scale: 0.4, autoAlpha: 0.35, duration: 0.8 + i * 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })))
      },
    })
    tl.to(halo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
    cards.forEach((c, i) => {
      tl.to(c, { autoAlpha: CARDS[i].o, scale: CARDS[i].scale, rotate: CARDS[i].rot, x: 0, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, 0.06 + i * 0.1)
    })
    tl.to(sparks, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.8)' }, 0.4)
      .to(lock, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2.4)' }, 0.6)

    return () => { tl.kill(); idles.forEach((x) => x.kill()); gsap.killTweensOf(all) }
  }, [isActive])

  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div className="relative" style={{ width: 240, height: 264 }}>
        <span ref={haloRef} aria-hidden className="absolute rounded-full pointer-events-none"
          style={{ left: 25, top: 40, width: 190, height: 190, background: 'radial-gradient(circle, rgba(226,49,155,0.40) 0%, rgba(226,49,155,0) 70%)' }} />

        {SPARKS.map((p, i) => (
          <span key={i} ref={(el) => { sparkRefs.current[i] = el }} className="absolute" style={{ left: p.x, top: p.y }}>
            <svg width={p.s} height={p.s} viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
              <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
            </svg>
          </span>
        ))}

        {CARDS.map((c, i) => (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el }}
            className="absolute rounded-[20px] overflow-hidden bg-white border border-black/10"
            style={{ left: c.left, top: c.top, width: 128, height: 178, zIndex: c.z, transformOrigin: 'bottom center', boxShadow: '0 16px 34px rgba(0,0,0,0.16)' }}
          >
            <div className="absolute inset-0" style={{ filter: 'blur(5px)', transform: 'scale(1.1)' }}>
              <img src={photos[i] ?? FALLBACK[i]} alt="" className="w-full h-full object-cover object-top" draggable={false} />
              <div aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: 90, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85) 70%, #fff)' }} />
            </div>
            {/* obscured name bar */}
            <div className="absolute left-4 right-4 bottom-5 flex flex-col items-center gap-1.5">
              <span className="h-3 w-[58%] rounded-full bg-white/85" style={{ filter: 'blur(1px)' }} />
              <span className="h-2 w-[36%] rounded-full bg-white/70" style={{ filter: 'blur(1px)' }} />
            </div>
          </div>
        ))}

        {/* Lock badge */}
        <div
          ref={lockRef}
          className="absolute z-10 rounded-full flex items-center justify-center"
          style={{ left: 92, top: 96, width: 58, height: 58, background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 14px 28px rgba(226,49,155,0.5)', border: '3px solid #fff' }}
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
