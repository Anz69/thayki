import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { useTranslation } from 'react-i18next'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import FaqModal from '@/components/modals/FaqModal'
import GradientBorder from '@/components/ui/GradientBorder'
import useAuthStore from '@/stores/useAuthStore'
import i18n, { setLanguage } from '@/i18n'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">{children}</p>
  )
}

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
  const navigate = useTransitionNavigate()
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

  const langs = ['ru', 'en']
  const active = (i18n.language || 'ru').startsWith('en') ? 'en' : 'ru'
  const idx = langs.indexOf(active)

  return (
    <>
      <section ref={rootRef} className="flex flex-col min-h-screen bg-white">
        <div className="flex flex-col gap-4 container pt-[40px] pb-[120px]">
          {auth.user && (
            <div data-anim>
              <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-3.5 flex items-center gap-3">
                <div className="size-14 rounded-full overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {auth.user.photo_url
                    ? <img src={resolveMediaUrl(auth.user.photo_url)} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[#E2319B] text-xl font-bold">{(auth.user.first_name || '?')[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-black text-[18px]/[120%] font-semibold truncate">
                    {`${auth.user.first_name || ''} ${auth.user.last_name || ''}`.trim() || t('manager.title')}
                  </span>
                  <span className="text-[#E2319B] text-[12px]/[120%] font-medium mt-0.5">{t('manager.title')}</span>
                </div>
              </GradientBorder>
            </div>
          )}

          <div data-anim className="flex flex-col gap-4">
            <SectionLabel>{t('more.important')}</SectionLabel>
            <button
              onClick={() => navigate('/home')}
              className="w-full flex items-center gap-2.5 bg-[#E2319B] rounded-xl px-4 py-4.5 active:opacity-90 transition-opacity"
            >
              <span className="flex items-center justify-center w-5 h-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="text-white text-[16px]/[100%] font-semibold">{t('manager.title')}</span>
            </button>
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
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.faq')}</span>
            </button>
            <button onClick={() => navigate('/support')} className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors">
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.support')}</span>
            </button>
          </div>
        </div>
      </section>

      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}
