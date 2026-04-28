import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { subscribePageReady, setLoaderDone, getPageReady } from '@/utils/pageTransition'

const MAX_LIFETIME_MS = 6000

export default function AppLoader() {
  const [visible, setVisible] = useState(true)
  const overlayRef = useRef(null)
  const logoRef    = useRef(null)
  const ringRef    = useRef(null)
  const idleTl     = useRef(null)
  const ringTl     = useRef(null)
  const entryDone  = useRef(false)
  const shouldExit = useRef(false)
  const exited     = useRef(false)

  function forceHide() {
    if (exited.current) return
    exited.current = true
    try {
      idleTl.current?.kill()
      ringTl.current?.kill()
      gsap.set(overlayRef.current, { autoAlpha: 0 })
    } catch {}
    setLoaderDone()
    setVisible(false)
  }

  function runExit() {
    if (exited.current) return
    try {
      idleTl.current?.kill()
      ringTl.current?.kill()
    } catch {}

    let completed = false
    const finish = () => {
      if (completed) return
      completed = true
      exited.current = true
      setVisible(false)
    }

    const tl = gsap.timeline({ onComplete: finish })

    const fallback = setTimeout(finish, 1200)

    tl.to(ringRef.current, {
      scale: 0.4,
      autoAlpha: 0,
      duration: 0.24,
      ease: 'power3.in',
    }, 0)

    tl.to(logoRef.current, {
      scale: 0.92,
      duration: 0.12,
      ease: 'power2.in',
    }, 0)
    tl.to(logoRef.current, {
      autoAlpha: 0,
      scale: 1.22,
      y: -18,
      filter: 'blur(8px)',
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => {
        try { gsap.set(logoRef.current, { clearProps: 'filter' }) } catch {}
      },
    }, 0.1)

    tl.fromTo(overlayRef.current,
      { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
      {
        clipPath: 'inset(50% 50% 50% 50% round 40px)',
        duration: 0.52,
        ease: 'expo.in',
        onComplete: () => {
          try { gsap.set(overlayRef.current, { autoAlpha: 0 }) } catch {}
          clearTimeout(fallback)
        },
      }, 0.18,
    )

    tl.call(setLoaderDone, [], 0.40)
  }

  useEffect(() => {
    try { gsap.set(ringRef.current, { autoAlpha: 0, scale: 0.6 }) } catch {}

    const tl = gsap.timeline({
      onComplete: () => {
        try {
          entryDone.current = true

          ringTl.current = gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
          ringTl.current
            .fromTo(ringRef.current,
              { scale: 0.88, autoAlpha: 0.55 },
              { scale: 1.65, autoAlpha: 0, duration: 1.4, ease: 'power2.out' },
            )

          idleTl.current = gsap.to(logoRef.current, {
            scale: 1.04, duration: 2.0, ease: 'sine.inOut', yoyo: true, repeat: -1,
          })

          if (shouldExit.current) runExit()
        } catch {
          shouldExit.current = false
          forceHide()
        }
      },
    })

    tl.fromTo(logoRef.current,
      { autoAlpha: 0, scale: 0.75, filter: 'blur(18px)', y: 14 },
      {
        autoAlpha: 1, scale: 1, filter: 'blur(0px)', y: 0,
        duration: 0.82, ease: 'expo.out', delay: 0.08,
        clearProps: 'filter',
      },
    )
    tl.to(logoRef.current, { scale: 1.018, duration: 0.14, ease: 'power2.out' })
    tl.to(logoRef.current, { scale: 1,     duration: 0.22, ease: 'elastic.out(1, 0.5)' })

    const lifetimeId = setTimeout(() => {
      if (!exited.current) forceHide()
    }, MAX_LIFETIME_MS)

    return () => clearTimeout(lifetimeId)
  }, [])

  useEffect(() => {
    if (getPageReady()) {
      if (entryDone.current) runExit()
      else shouldExit.current = true
      return
    }
    const unsub = subscribePageReady((ready) => {
      if (!ready) return
      unsub()
      if (entryDone.current) runExit()
      else shouldExit.current = true
    })
    return unsub
  }, [])

  if (!visible) return null
  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        willChange: 'clip-path',
      }}
    >
      <div
        ref={ringRef}
        style={{
          position: 'absolute',
          width: 160, height: 160,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.10)',
          pointerEvents: 'none',
        }}
      />

      <img
        ref={logoRef}
        src="/img/thaiky.png"
        alt=""
        style={{ width: 130, height: 'auto', visibility: 'hidden', position: 'relative', zIndex: 1 }}
      />
    </div>
  )
}
