import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import gsap from 'gsap'
import useAuthStore from '@/stores/useAuthStore'
import useMeetingStore from '@/stores/useMeetingStore'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? ''

const IS_LOCALHOST = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const SHOW_WIDGET = !IS_LOCALHOST && !!BOT_USERNAME

function buildFakeInitData(telegramId, firstName, username) {
  const user = JSON.stringify({
    id:             telegramId,
    first_name:     firstName || 'Dev',
    last_name:      'User',
    username:       username  || `dev_${telegramId}`,
    language_code:  'ru',
    is_premium:     false,
    allows_write_to_pm: true,
  })
  const authDate = Math.floor(Date.now() / 1000)
  return `auth_date=${authDate}&hash=devmode_bypass&user=${encodeURIComponent(user)}`
}

function getOrCreateDevId() {
  try {
    const stored = localStorage.getItem('__dev_tg_id')
    if (stored) return parseInt(stored, 10)
    const id = Math.floor(Math.random() * 900_000_000) + 100_000_000
    localStorage.setItem('__dev_tg_id', String(id))
    return id
  } catch {
    return 123456789
  }
}

export default function LoginPage() {
  const authStore    = useAuthStore()
  const meetingStore = useMeetingStore()
  const navigate     = useTransitionNavigate()
  const widgetRef    = useRef(null)

  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [devName,  setDevName]  = useState('')
  const [showDev,  setShowDev]  = useState(false)

  const devId = useMemo(getOrCreateDevId, [])

  const logoRef     = useRef(null)
  const titleRef    = useRef(null)
  const subtitleRef = useRef(null)
  const cardRef     = useRef(null)
  const footerRef   = useRef(null)

  useLayoutEffect(() => {
    gsap.set(logoRef.current,     { autoAlpha: 0, y: -40, scale: 0.82 })
    gsap.set(titleRef.current,    { autoAlpha: 0, y: 22 })
    gsap.set(subtitleRef.current, { autoAlpha: 0, y: 14 })
    gsap.set(cardRef.current,     { autoAlpha: 0, y: 36, scale: 0.94 })
    gsap.set(footerRef.current,   { autoAlpha: 0 })
  }, [])

  usePageReady(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    tl.to(logoRef.current, {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.72,
      onComplete: () => gsap.set(logoRef.current, { clearProps: 'will-change' }),
    })
      .to(titleRef.current,    { autoAlpha: 1, y: 0, duration: 0.5  }, 0.14)
      .to(subtitleRef.current, { autoAlpha: 1, y: 0, duration: 0.44 }, 0.24)
      .to(cardRef.current, {
        autoAlpha: 1, y: 0, scale: 1, duration: 0.58,
        ease: 'back.out(1.7)',
        onComplete: () => gsap.set(cardRef.current, { clearProps: 'will-change' }),
      }, 0.34)
      .to(footerRef.current, { autoAlpha: 1, duration: 0.38 }, 0.54)
  })

  useEffect(() => {
    if (authStore.user) navigate('/home', { replace: true })
  }, [authStore.user])

  async function postToAuth(url, body) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
    const res  = await fetch(url, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
      credentials: 'same-origin',
      body:        JSON.stringify(body),
    })
    return res.json()
  }

  const handleDevLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const nameParts = devName.trim().split(' ')
      const firstName = nameParts[0] || 'Dev'
      const username  = devName.trim().replace(/\s+/g, '_').toLowerCase() || undefined

      const initData = buildFakeInitData(devId, firstName, username)
      const data = await postToAuth('/auth/telegram', { init_data: initData })

      if (data.ok && data.user) {
        gsap.to(cardRef.current, {
          scale: 1.03, duration: 0.15, ease: 'power2.out',
          onComplete: () => {
            authStore.setUser(data.user, data.token ?? null)
            meetingStore.loadLatest()
            gsap.to([cardRef.current, subtitleRef.current, footerRef.current], {
              autoAlpha: 0, y: -10, duration: 0.25, ease: 'power2.in', stagger: 0.04,
            })
            gsap.to([logoRef.current, titleRef.current], {
              autoAlpha: 0, y: -20, duration: 0.32, ease: 'power2.in', delay: 0.08,
              onComplete: () => navigate('/home', { replace: true }),
            })
          },
        })
      } else {
        setError(data.error ?? 'Ошибка входа')
        gsap.fromTo(cardRef.current,
          { x: 0 },
          { x: 8, duration: 0.08, ease: 'none', yoyo: true, repeat: 5,
            onComplete: () => gsap.set(cardRef.current, { x: 0 }) },
        )
      }
    } catch {
      setError('Ошибка сети. Проверьте что сервер запущен.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!SHOW_WIDGET || !widgetRef.current) return

    window.__telegramWidgetCallback = async (tgUser) => {
      setLoading(true)
      setError(null)
      try {
        const data = await postToAuth('/auth/telegram-widget', tgUser)
        if (data.ok && data.user) {
          authStore.setUser(data.user, data.token ?? null)
          meetingStore.loadLatest()
          navigate('/home', { replace: true })
        } else {
          setError(data.error ?? 'Ошибка авторизации')
        }
      } catch {
        setError('Ошибка сети. Попробуйте ещё раз.')
      } finally {
        setLoading(false)
      }
    }

    const script = document.createElement('script')
    script.src   = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size',           'large')
    script.setAttribute('data-radius',         '12')
    script.setAttribute('data-onauth',         '__telegramWidgetCallback(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    widgetRef.current.appendChild(script)

    return () => {
      delete window.__telegramWidgetCallback
      if (widgetRef.current) widgetRef.current.innerHTML = ''
    }
  }, [])

  return (
    <section className="min-h-dvh bg-white flex flex-col items-center justify-center gap-6 px-6">

      
      <div ref={logoRef} className="invisible">
        <img src="/img/thaiky.png" alt="" className="size-36 object-contain drop-shadow-sm" />
      </div>

      
      <div className="flex flex-col items-center gap-2 text-center">
        <h1
          ref={titleRef}
          className="invisible text-black text-[28px]/[110%] font-[500] tracking-tight"
        >
          Добро пожаловать
        </h1>
        <p
          ref={subtitleRef}
          className="invisible text-[#7F7F7F] text-sm/[160%] font-medium max-w-[240px]"
        >
          {IS_LOCALHOST
            ? 'Режим разработки'
            : 'Войдите через Telegram, чтобы продолжить'}
        </p>
      </div>

      
      <div
        ref={cardRef}
        className="invisible w-full max-w-[320px] bg-[#F7F6FA] rounded-3xl p-5 flex flex-col gap-4"
      >
        {IS_LOCALHOST ? (
          <>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-[500] text-amber-600 uppercase tracking-wider">
                Dev mode · только localhost
              </span>
            </div>

            <p className="text-[#555] text-xs/[160%]">
              Бэкенд запущен с <code className="bg-[#E8E7EC] px-1 rounded text-[11px]">TELEGRAM_ALLOW_UNSIGNED=true</code> — подпись не проверяется. Ваш dev ID: <span className="font-mono font-[500]">{devId}</span>
            </p>

            {showDev && (
              <input
                type="text"
                value={devName}
                onChange={e => setDevName(e.target.value)}
                placeholder="Имя (опционально)"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0DFE5] text-sm text-black placeholder-[#B0B0B0] outline-none focus:border-[#229ED9] transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleDevLogin()}
              />
            )}

            <button
              onClick={handleDevLogin}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#232323] text-white text-sm/[100%] font-[500] text-center flex items-center justify-center gap-2 active:opacity-70 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Входим...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z" fill="white"/>
                  </svg>
                  Войти как Dev User
                </>
              )}
            </button>

            <button
              onClick={() => setShowDev(v => !v)}
              className="text-[#B0B0B0] text-[11px] font-medium text-center underline underline-offset-2 active:opacity-60"
            >
              {showDev ? 'Скрыть настройки' : 'Изменить имя пользователя'}
            </button>

            {error && (
              <p className="text-[#E2319B] text-xs/[150%] font-medium text-center -mt-1">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E8E7EC]" />
              <span className="text-[#C0BFC4] text-[10px] font-medium">или</span>
              <div className="flex-1 h-px bg-[#E8E7EC]" />
            </div>

            <a
              href={BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : 'https://t.me'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-[#229ED9]/10 text-[#229ED9] text-sm/[100%] font-[500] text-center flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
            >
            
              Открыть бота в Telegram
            </a>

            <p className="text-[#C0BFC4] text-[10px]/[150%] text-center">
              Открытие бота в TG не авторизует эту вкладку автоматически — используйте кнопку выше.
            </p>
          </>
        ) : (
          <>
            <p className="text-[#7F7F7F] text-xs/[150%] font-medium text-center">
              Войдите через аккаунт Telegram
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="size-5 border-2 border-[#229ED9] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#7F7F7F] text-sm font-medium">Авторизация...</span>
              </div>
            ) : (
              <div ref={widgetRef} className="flex justify-center min-h-[48px]" />
            )}

            {error && (
              <p className="text-[#E2319B] text-xs/[150%] font-medium text-center">{error}</p>
            )}
          </>
        )}
      </div>

      
      <p
        ref={footerRef}
        className="invisible text-[#C0BFC4] text-[11px]/[160%] font-medium text-center max-w-[220px]"
      >
        Мы используем только публичные данные Telegram для входа
      </p>
    </section>
  )
}

