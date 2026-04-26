import { useRef, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'

/**
 * "Double-bottom" welcome screen shown to is_strange=true users.
 *
 * Strange users can't reach the catalog / booking / chat pages — only
 * this stub. The single CTA opens the public Telegram chat.
 *
 * Why a real <a href> instead of a button + onClick:
 *   Telegram WebApp's openTelegramLink() worked inconsistently — on some
 *   client builds it silently no-op'd, leaving users staring at an
 *   unresponsive button. A native <a target="_blank"> always works
 *   because the click is delegated to the OS, which Telegram itself
 *   intercepts and routes to the in-app chat.
 *
 * We still call openTelegramLink() inside an onClick fallback for
 * environments where the OS handler doesn't intercept the URL — but
 * we DON'T preventDefault on the click, so the anchor is the primary
 * navigation path.
 */
export default function StrangeWelcomePage() {
  const cardRef  = useRef(null)
  const titleRef = useRef(null)
  const subRef   = useRef(null)
  const btnRef   = useRef(null)

  useLayoutEffect(() => {
    gsap.set(cardRef.current,  { autoAlpha: 0, y: 24 })
    gsap.set(titleRef.current, { autoAlpha: 0, y: -10 })
    gsap.set(subRef.current,   { autoAlpha: 0, y: -8 })
    gsap.set(btnRef.current,   { autoAlpha: 0, y: 12, scale: 0.94 })
  }, [])

  usePageReady(() => {
    const tl = gsap.timeline()
    tl.to(cardRef.current,  { autoAlpha: 1, y: 0, duration: 0.5,  ease: 'expo.out' })
      .to(titleRef.current, { autoAlpha: 1, y: 0, duration: 0.4,  ease: 'expo.out' }, 0.1)
      .to(subRef.current,   { autoAlpha: 1, y: 0, duration: 0.4,  ease: 'expo.out' }, 0.18)
      .to(btnRef.current,   { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, 0.28)
  })

  // Best-effort call to Telegram's native handler. We don't preventDefault
  // — if it succeeds the WebApp closes/navigates and the anchor never
  // fires, if it fails the browser falls back to the <a> behaviour.
  const onCtaClick = useCallback((event) => {
    try {
      const tg = window.Telegram?.WebApp
      if (tg?.openTelegramLink) {
        tg.openTelegramLink('https://t.me/ThaikyChat')
        // Some Telegram clients honour openTelegramLink only when we
        // suppress the default — but suppressing universally breaks
        // browsers where the call silently no-ops. Compromise:
        // suppress only when the Telegram SDK is present.
        event.preventDefault()
      }
    } catch { /* fall through to anchor default */ }
  }, [])

  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      <div ref={cardRef} className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <h1 ref={titleRef} className="text-black text-[24px]/[120%] font-semibold">
          Привет!
        </h1>
        <p ref={subRef} className="text-[#7F7F7F] text-base/[150%] font-medium">
          Вы можете присоединиться к нашему чату <span className="text-[#E2319B] font-semibold">@ThaikyChat</span> и начать общение.
        </p>
        <a
          ref={btnRef}
          href="https://t.me/ThaikyChat"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onCtaClick}
          className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity text-center"
        >
          Перейти в чат
        </a>
      </div>
    </section>
  )
}
