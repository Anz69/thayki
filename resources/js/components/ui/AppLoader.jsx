import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { subscribePageReady, setLoaderDone } from '@/utils/pageTransition'

export default function AppLoader() {
  const [visible, setVisible] = useState(true)
  const overlayRef = useRef(null)
  const logoRef    = useRef(null)
  const ringRef    = useRef(null)
  const idleTl     = useRef(null)
  const ringTl     = useRef(null)
  const entryDone  = useRef(false)
  const shouldExit = useRef(false)

  function runExit() {
    idleTl.current?.kill()
    ringTl.current?.kill()

    const tl = gsap.timeline({ onComplete: () => setVisible(false) })

    // 1. Ring collapses inward
    tl.to(ringRef.current, {
      scale: 0.4,
      autoAlpha: 0,
      duration: 0.24,
      ease: 'power3.in',
    }, 0)

    // 2. Logo compresses slightly, then launches up & blurs out
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
      onComplete: () => gsap.set(logoRef.current, { clearProps: 'filter' }),
    }, 0.1)

    // 3. White overlay collapses to center point like a closing iris
    tl.fromTo(overlayRef.current,
      { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
      {
        clipPath: 'inset(50% 50% 50% 50% round 40px)',
        duration: 0.52,
        ease: 'expo.in',
        onComplete: () => gsap.set(overlayRef.current, { autoAlpha: 0 }),
      }, 0.18,
    )

    // Fire setLoaderDone when iris is ~50% through its collapse.
    // This triggers usePageReady callbacks → page entrance animations
    // begin while the overlay is still closing, syncing the reveal with
    // the content animation.
    tl.call(setLoaderDone, [], 0.40)
  }

  // ─── Entry ───────────────────────────────────────────────────
  useEffect(() => {
    // Hide ring initially
    gsap.set(ringRef.current, { autoAlpha: 0, scale: 0.6 })

    const tl = gsap.timeline({
      onComplete: () => {
        entryDone.current = true

        // Start pulsing ring
        ringTl.current = gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
        ringTl.current
          .fromTo(ringRef.current,
            { scale: 0.88, autoAlpha: 0.55 },
            { scale: 1.65, autoAlpha: 0, duration: 1.4, ease: 'power2.out' },
          )

        // Breathing
        idleTl.current = gsap.to(logoRef.current, {
          scale: 1.04, duration: 2.0, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })

        if (shouldExit.current) runExit()
      },
    })

    // Step 1 — blur focus-in
    tl.fromTo(logoRef.current,
      { autoAlpha: 0, scale: 0.75, filter: 'blur(18px)', y: 14 },
      {
        autoAlpha: 1, scale: 1, filter: 'blur(0px)', y: 0,
        duration: 0.82, ease: 'expo.out', delay: 0.08,
        clearProps: 'filter',
      },
    )

    // Step 2 — micro-bounce landing
    tl.to(logoRef.current, { scale: 1.018, duration: 0.14, ease: 'power2.out' })
    tl.to(logoRef.current, { scale: 1,     duration: 0.22, ease: 'elastic.out(1, 0.5)' })
  }, [])

  // ─── Exit when page ready ─────────────────────────────────────
  useEffect(() => {
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
      {/* Pulsing ring behind the logo */}
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
