import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { useTranslation } from 'react-i18next'
import { usePageReady } from '@/composables/usePageReady'
import FaqModal from '@/components/modals/FaqModal'
import i18n, { setLanguage } from '@/i18n'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import { SectionLabel } from './kit'

const IconQuestion = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M7.36 7.31c.07-.19.17-.37.3-.52.12-.15.27-.27.44-.37.34-.2.74-.27 1.14-.21.39.07.75.27 1 .58.26.3.4.69.4 1.09 0 1.12-1.69 1.69-1.69 1.69v.15M8.97 11.81h.01M16.5 9A7.5 7.5 0 1 1 1.5 9a7.5 7.5 0 0 1 15 0Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={['relative w-[46px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0', value ? 'bg-[#E2319B]' : 'bg-[#D1D1D6]'].join(' ')}
    >
      <span className={['absolute top-[6px] size-3 rounded-full bg-white transition-transform duration-200', !value ? 'translate-x-[-16px]' : 'translate-x-[4px]'].join(' ')} />
    </button>
  )
}

export default function ManagerMorePage() {
  const { t } = useTranslation()
  const auth = useAuthStore()
  const [faqOpen, setFaqOpen] = useState(false)
  const [notifications, setNotifications] = useState(auth.user?.notifications_enabled ?? true)
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.set(els, { autoAlpha: 0, y: 22 })
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })

  const handleNotifications = useCallback(async (next) => {
    setNotifications(next)
    try {
      const res = await api.patch('/me', { notifications_enabled: next })
      if (res?.data?.data && auth.setUser) auth.setUser(res.data.data)
    } catch { setNotifications((v) => !v) }
  }, [auth])

  const langs = ['ru', 'en', 'zh']
  const code = (i18n.language || 'ru').slice(0, 2).toLowerCase()
  const active = langs.includes(code) ? code : 'ru'
  const idx = langs.indexOf(active)

  return (
    <>
      <section ref={rootRef} className="flex flex-col min-h-screen bg-white">
        <div className="flex flex-col gap-4 container pt-[40px] pb-[120px]">

          <div data-anim className="flex flex-col gap-4">
            <SectionLabel>{t('more.important')}</SectionLabel>
            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-3">
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.language')}</span>
              <div className="relative flex items-center bg-white rounded-full p-0.5">
                <span className="absolute top-0.5 bottom-0.5 rounded-full bg-[#E2319B]" style={{ width: 44, left: 2, transform: `translateX(${idx * 44}px)`, transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.55,1)' }} />
                {langs.map((lng) => (
                  <button key={lng} onClick={() => setLanguage(lng)} className="relative z-10 py-1 rounded-full text-[13px] font-semibold outline-none" style={{ width: 44, color: active === lng ? '#fff' : '#9B9AA0' }}>
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-4">
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.notifications')}</span>
              <Toggle value={notifications} onChange={handleNotifications} />
            </div>
          </div>

          <div data-anim className="flex flex-col gap-4">
            <SectionLabel>{t('more.additional')}</SectionLabel>
            <button onClick={() => setFaqOpen(true)} className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors">
              <span className="flex items-center justify-center w-5 h-5"><IconQuestion /></span>
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.faq')}</span>
            </button>
          </div>
        </div>
      </section>

      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}
