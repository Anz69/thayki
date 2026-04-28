import { useRef, useLayoutEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useAuthStore from '@/stores/useAuthStore'

const CHAT_URL = 'https://t.me/ThaikyChat'

export default function StrangeWelcomePage() {
  const cardRef  = useRef(null)
  const titleRef = useRef(null)
  const subRef   = useRef(null)
  const btnsRef  = useRef(null)

  const authStore = useAuthStore()
  const navigate  = useNavigate()
  const [checking, setChecking] = useState(false)
  const [checkDone, setCheckDone] = useState(false)

  useLayoutEffect(() => {
    gsap.set(cardRef.current,  { autoAlpha: 0, y: 24 })
    gsap.set(titleRef.current, { autoAlpha: 0, y: -10 })
    gsap.set(subRef.current,   { autoAlpha: 0, y: -8 })
    gsap.set(btnsRef.current,  { autoAlpha: 0, y: 12, scale: 0.94 })
  }, [])

  usePageReady(() => {
    const tl = gsap.timeline()
    tl.to(cardRef.current,  { autoAlpha: 1, y: 0, duration: 0.5,  ease: 'expo.out' })
      .to(titleRef.current, { autoAlpha: 1, y: 0, duration: 0.4,  ease: 'expo.out' }, 0.1)
      .to(subRef.current,   { autoAlpha: 1, y: 0, duration: 0.4,  ease: 'expo.out' }, 0.18)
      .to(btnsRef.current,  { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, 0.28)
  })

  const openChat = useCallback((event) => {
    if (event) event.preventDefault()
    try {
      const tg = window.Telegram?.WebApp
      if (tg && typeof tg.openTelegramLink === 'function') {
        tg.openTelegramLink(CHAT_URL)
        return
      }
    } catch {}
    try {
      const w = window.open(CHAT_URL, '_blank', 'noopener,noreferrer')
      if (w) return
    } catch {}
    try { window.location.href = CHAT_URL } catch {}
  }, [])

  const checkAccess = useCallback(async () => {
    if (checking) return
    setChecking(true)
    try {
      await authStore.refreshUser()
      const user = authStore.user
      if (user && !user.is_strange) {
        navigate('/home', { replace: true })
        return
      }
      setCheckDone(true)
    } catch {}
    setChecking(false)
  }, [checking, authStore, navigate])

  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      <div ref={cardRef} className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E2319B]/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E2319B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 ref={titleRef} className="text-black text-[22px]/[120%] font-semibold">
          Доступ ограничен
        </h1>

        <p ref={subRef} className="text-[#7F7F7F] text-sm/[160%] font-medium max-w-[260px]">
          Для использования приложения необходим инвайт от текущего участника или верификация администратором.
        </p>

        <div ref={btnsRef} className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={openChat}
            className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
          >
            Перейти в чат поддержки
          </button>

          <button
            type="button"
            onClick={checkAccess}
            disabled={checking}
            className="w-full py-4 rounded-full border border-[#E2319B]/30 text-[#E2319B] text-sm/[100%] font-semibold active:opacity-70 transition-opacity disabled:opacity-50"
          >
            {checking
              ? 'Проверяем...'
              : checkDone
                ? 'Доступ пока не открыт'
                : 'Уже верифицированы? Проверить доступ'}
          </button>
        </div>
      </div>
    </section>
  )
}
