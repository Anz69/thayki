import { useRef, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTranslation } from 'react-i18next'
import TransitionLink from '@/components/TransitionLink'
import { useCompactMode } from '@/composables/useCompactMode'
import Globe from '@/components/landing/Globe'
import GlobeOverlay from '@/components/landing/GlobeOverlay'

export default function LandingPage() {
  const { t } = useTranslation()
  const isCompact = useCompactMode()

  const bottomRef   = useRef(null)
  const topWrapRef  = useRef(null)
  const globeBoxRef = useRef(null)
  const overlayRef  = useRef(null)

  const textLine1   = useRef(null)
  const textLine2   = useRef(null)
  const subtitleRef = useRef(null)
  const btnWrapRef  = useRef(null)

  // Size the top area so the globe fills from the top down to the bottom section
  useEffect(() => {
    const resize = () => {
      if (!bottomRef.current || !topWrapRef.current) return
      const vh = window.innerHeight
      const bottomH = bottomRef.current.offsetHeight
      topWrapRef.current.style.height = vh - bottomH + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const startAnimations = () => {
    const wordmark = overlayRef.current?.querySelector('[data-wordmark]')

    const tl = gsap.timeline()

    tl.to(globeBoxRef.current, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out' })
      .to(wordmark, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0.35)
      .to(
        [textLine1.current, textLine2.current],
        { y: '0%', opacity: 1, duration: 0.7, stagger: 0.13, ease: 'expo.out' },
        0.6,
      )
      .to(subtitleRef.current, { y: 0, autoAlpha: 0.5, duration: 0.55, ease: 'power3.out' }, 0.86)
      .to(btnWrapRef.current,  { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.8)' }, 0.98)
      .call(() => {
        gsap.to(btnWrapRef.current, {
          scale: 1.04, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.4,
        })
      })
  }

  useLayoutEffect(() => {
    const wordmark = overlayRef.current?.querySelector('[data-wordmark]')

    gsap.set(globeBoxRef.current, { autoAlpha: 0, scale: 0.92 })
    if (wordmark) gsap.set(wordmark, { opacity: 0, scale: 0.9 })
    gsap.set(textLine1.current,   { y: '120%', opacity: 0 })
    gsap.set(textLine2.current,   { y: '120%', opacity: 0 })
    gsap.set(subtitleRef.current, { autoAlpha: 0, y: 20 })
    gsap.set(btnWrapRef.current,  { autoAlpha: 0, y: 16, scale: 0.88 })
  }, [])

  useEffect(() => {
    return () => {
      const root = overlayRef.current
      gsap.killTweensOf([
        globeBoxRef.current, textLine1.current, textLine2.current,
        subtitleRef.current, btnWrapRef.current,
        root?.querySelector('[data-wordmark]'),
      ])
    }
  }, [])

  usePageReady(startAnimations)

  const titleSize = isCompact ? 'text-[26px]' : 'text-[32px]'
  const bottomPt  = isCompact ? 'pt-3' : 'pt-4'
  const bottomGap = isCompact ? 'gap-3' : 'gap-5'
  const textGap   = isCompact ? 'gap-1' : 'gap-2.5'

  return (
    <main className="flex flex-col h-dvh overflow-hidden">

      {/* ── Globe hero — fills from top down to the bottom section ── */}
      <div
        ref={topWrapRef}
        className="absolute inset-x-0 top-0 z-0 flex items-start justify-center px-2 overflow-hidden"
      >
        <div
          ref={globeBoxRef}
          className="invisible relative w-full max-w-[600px] aspect-square -mt-[3%]"
          style={{ willChange: 'transform, opacity' }}
        >
          <Globe className="absolute inset-0" />
          <GlobeOverlay ref={overlayRef} />
        </div>
      </div>

      {/* ── Bottom section: text + button ── */}
      <div
        ref={bottomRef}
        className={`mt-auto relative z-50 container flex flex-col items-center bg-white ${bottomPt} ${bottomGap}`}
        style={{
          paddingBottom: `max(4vh, calc(env(safe-area-inset-bottom) + ${isCompact ? '12px' : '16px'}))`,
        }}
      >
        {/* Title + subtitle */}
        <div className={`flex flex-col items-center text-center ${textGap}`}>
          <h1 className={`text-black font-semibold leading-[110%] ${titleSize}`}>
            <span className="block" style={{ overflow: 'hidden', paddingBottom: 4 }}>
              <span ref={textLine1} className="block">{t('landing.title')}</span>
            </span>
            <span className="block" style={{ overflow: 'hidden', paddingBottom: 4 }}>
              <span ref={textLine2} className="block">{t('landing.region')}</span>
            </span>
          </h1>
          <p
            ref={subtitleRef}
            className={`invisible text-black font-medium opacity-50 ${isCompact ? 'text-sm/[120%]' : 'text-base/[130%]'} max-w-[320px]`}
          >
            {t('landing.subtitle')}
          </p>
        </div>

        {/* CTA button */}
        <div ref={btnWrapRef} className="invisible">
          <TransitionLink
            to="/home"
            className="bg-black w-[191px] flex items-center gap-2.5 justify-center text-white text-base/[100%] font-medium rounded-full group"
            style={{ paddingTop: isCompact ? 14 : 16, paddingBottom: isCompact ? 14 : 16 }}
          >
            {t('landing.cta')}
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-all duration-300"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.28592 8.04705H12.6193M7.99996 12.7611L12.714 8.04705L7.99996 3.33301"
                stroke="white"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </TransitionLink>
        </div>
      </div>
    </main>
  )
}
