import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'

/**
 * "Double-bottom" welcome screen shown to is_strange=true users.
 *
 * The Mini App is gated behind a verify-invite flow: a strange user just
 * sees this stub with a single CTA — open the public Telegram chat. They
 * never reach catalog / booking / chat etc., so unverified visitors can't
 * fingerprint the system or place bookings before they go through the
 * proper invite flow.
 *
 * Once they /start the bot via a valid `verify` invite token, the backend
 * flips is_strange=false and they get full access.
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

  const openChat = () => {
    const url = 'https://t.me/ThaikyChat'
    try {
      const tg = window.Telegram?.WebApp
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(url)
        return
      }
    } catch { /* ignore */ }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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
          onClick={openChat}
          className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
        >
          Перейти в чат
        </button>
      </div>
    </section>
  )
}
