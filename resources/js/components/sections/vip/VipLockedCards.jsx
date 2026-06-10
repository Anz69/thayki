import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import ModelCardCarousel from '@/components/ui/ModelCardCarousel'

const SPARKS = [
  { x: 210, y: 24, s: 22 },
  { x: 10, y: 64, s: 15 },
  { x: 26, y: 210, s: 12 },
  { x: 214, y: 190, s: 16 },
]

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
      delay: 0.7,
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
      <div className="relative w-full" style={{ height: 300, maxWidth: 360 }}>
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          <ModelCardCarousel isActive={isActive} blur />
        </div>

      </div>
    </div>
  )
}
