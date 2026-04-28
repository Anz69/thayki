import { useRef, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'

const CHAT_URL = 'https://t.me/ThaikyChat'

/**
 * "Double-bottom" welcome screen shown to is_strange=true users.
 *
 * Strange users can't reach the catalog / booking / chat pages — only
 * this stub. The single CTA opens the public Telegram chat.
 *
 * Why a manual click handler with multiple fallbacks instead of a plain
 * <a target="_blank">:
 *   Telegram Mini App webviews don't honor target="_blank" — clicking a
 *   blank-target anchor inside the WebApp does nothing visible. So we
 *   try, in order:
 *     1. Telegram.WebApp.openTelegramLink(url) — recommended path inside
 *        the WebApp, opens the t.me chat in the parent Telegram client.
 *     2. window.open(url, '_blank') — works in regular browsers.
 *     3. window.location.href = url — last-resort, replaces the WebApp
 *        with the Telegram chat URL (Telegram intercepts t.me URLs and
 *        navigates to the chat).
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

  const openChat = useCallback((event) => {
    if (event) event.preventDefault()

    try {
      const tg = window.Telegram?.WebApp
      if (tg && typeof tg.openTelegramLink === 'function') {
        tg.openTelegramLink(CHAT_URL)
        return
      }
    } catch { /* fall through */ }

    try {
      const w = window.open(CHAT_URL, '_blank', 'noopener,noreferrer')
      if (w) return
    } catch { /* fall through */ }

    try {
      window.location.href = CHAT_URL
    } catch { /* nothing else we can do */ }
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
        <button
          ref={btnRef}
          type="button"
          onClick={openChat}
          className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
        >
          Перейти в чат
        </button>
      </div>
    </section>
  )
}
