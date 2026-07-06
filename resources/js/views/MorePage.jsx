import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import FaqModal from '@/components/modals/FaqModal'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import GradientBorder from '@/components/ui/GradientBorder'
import useAuthStore from '@/stores/useAuthStore'
import { useTranslation } from 'react-i18next'
import i18n, { setLanguage } from '@/i18n'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import { logError } from '@/utils/logger'

const ACTIVE_STATUS = {
  new:              { key: 'new',             fg: '#E2319B' },
  in_progress:      { key: 'inProgress',      fg: '#C77A12' },
  awaiting_client:  { key: 'awaitingClient',  fg: '#2F6BD8' },
  awaiting_payment: { key: 'awaitingPayment', fg: '#C77A12' },
  prepaid:          { key: 'prepaid',         fg: '#1E9E4E' },
}

const IconQuestion = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M7.36153 7.31418C7.42966 7.1205 7.53199 6.94248 7.6622 6.7878C7.78455 6.64246 7.93151 6.51773 8.09783 6.41998C8.44115 6.21821 8.8448 6.14445 9.23729 6.21178C9.62978 6.2791 9.98578 6.48315 10.2422 6.7878C10.4987 7.09245 10.6391 7.47804 10.6385 7.87626C10.6385 9.00042 8.95222 9.5625 8.95222 9.5625V9.71778M8.97404 11.8125H8.98154M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSupport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <g clipPath="url(#clip_sup_more)">
      <path d="M4.875 15.2462L7.59984 12.5213M5.41959 10.459L2.81934 13.0592M5.41959 7.54085L2.75368 4.87493M4.91103 2.78965L7.37132 5.24993M13.0377 15.1589L10.5173 12.6386M12.5803 10.459L15.1736 13.0523M13.125 2.75354L10.5173 5.36124M12.6213 7.49993L15.1913 4.92984M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9ZM12.75 8.99998C12.75 11.071 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.071 5.25 8.99998C5.25 6.92891 6.92893 5.24998 9 5.24998C11.0711 5.24998 12.75 6.92891 12.75 8.99998Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip_sup_more"><rect width="18" height="18" fill="white" /></clipPath>
    </defs>
  </svg>
)

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">
      {children}
    </p>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        'relative w-[46px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0',
        value ? 'bg-[#E2319B]' : 'bg-[#D1D1D6]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-[6px] size-3 rounded-full bg-white transition-transform duration-200',
          !value ? 'translate-x-[-16px]' : 'translate-x-[4px]',
        ].join(' ')}
      />
    </button>
  )
}

export default function MorePage() {
  const navigate = useTransitionNavigate()
  const auth = useAuthStore()
  const { t } = useTranslation()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [notifications, setNotifications] = useState(
    auth.user?.notifications_enabled ?? true
  )
  const handleNotificationsChange = useCallback(async (next) => {
    setNotifications(next)
    try {
      const res = await api.patch('/me', { notifications_enabled: next })
      const updated = res?.data?.data
      if (updated && auth.setUser) auth.setUser(updated)
    } catch {
      setNotifications((v) => !v)
    }
  }, [auth])
  const [activeLeads, setActiveLeads] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get('/leads', { params: { page: 1, per_page: 20 } })
      .then(({ data }) => {
        if (cancelled) return
        const items = Array.isArray(data?.data) ? data.data : []
        setActiveLeads(items.filter((l) => !!ACTIVE_STATUS[l.status] && l.chat_id))
      })
      .catch((e) => { logError(e); if (!cancelled) setActiveLeads([]) })
    return () => { cancelled = true }
  }, [])

  const openLead = useCallback((lead) => {
    if (!lead?.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/more')}`)
  }, [navigate])

  const section1Ref = useRef(null)
  const section2Ref = useRef(null)

  useLayoutEffect(() => {
    if (section1Ref.current) gsap.set(section1Ref.current, { autoAlpha: 0, y: 24 })
    if (section2Ref.current) gsap.set(section2Ref.current, { autoAlpha: 0, y: 24 })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  usePageReady(() => {
    const s1 = section1Ref.current
    const s2 = section2Ref.current
    if (!s1 || !s2) return
    gsap.timeline()
      .to(s1, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0)
      .to(s2, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.1)
  })

  return (
    <>
      <section className="flex flex-col min-h-screen bg-white">

        <div className="flex flex-col gap-4 container pt-[40px] pb-[120px]">

          {auth.user && (
            <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-3.5 flex items-center gap-3">
              <div className="size-14 rounded-full overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                {auth.user.photo_url
                  ? <img src={resolveMediaUrl(auth.user.photo_url)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[#E2319B] text-xl font-bold">{(auth.user.first_name || '?')[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-black text-[18px]/[120%] font-semibold truncate">
                  {`${auth.user.first_name || ''} ${auth.user.last_name || ''}`.trim() || t('common.client')}
                </span>
                {auth.user.username && (
                  <span className="text-[#8A8A8A] text-sm/[120%] truncate">@{auth.user.username}</span>
                )}
              </div>
            </GradientBorder>
          )}

          <div ref={section1Ref} className="flex flex-col gap-4">
            <SectionLabel>{t('more.important')}</SectionLabel>

            {activeLeads === null ? (
              <div className="w-full h-[84px] rounded-2xl bg-[#F1EFF3] animate-pulse" />
            ) : activeLeads.length > 0 ? (
              <>
                {activeLeads.map((lead) => {
                  const st = ACTIVE_STATUS[lead.status] ?? ACTIVE_STATUS.new
                  const m = lead.model
                  const photo = m?.photo ? resolveMediaUrl(m.photo) : null
                  const title = (m && modelName(m)) || `${t('requestChat.title')} #${lead.id}`
                  return (
                    <button
                      key={lead.id}
                      onClick={() => openLead(lead)}
                      className="w-full flex items-center gap-3.5 rounded-2xl px-3.5 py-3.5 bg-[#FBEAF3] active:bg-[#F7DEEC] transition-colors text-left"
                    >
                      <div className="size-[52px] rounded-[15px] shrink-0 flex items-center justify-center overflow-hidden bg-[#E2319B]">
                        {photo
                          ? <img src={photo} alt="" className="w-full h-full object-cover object-top" />
                          : (
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                              <path d="M12 3.5c.3 3.4 1.6 4.7 5 5-3.4.3-4.7 1.6-5 5-.3-3.4-1.6-4.7-5-5 3.4-.3 4.7-1.6 5-5Z" fill="#fff" />
                              <path d="M18.6 13.6c.14 1.55.75 2.16 2.3 2.3-1.55.14-2.16.75-2.3 2.3-.14-1.55-.75-2.16-2.3-2.3 1.55-.14 2.16-.75 2.3-2.3Z" fill="#fff" fillOpacity="0.9" />
                            </svg>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[11px]/[100%] font-semibold uppercase tracking-[0.08em] text-[#E2319B]">
                          {t('more.activeRequest')}
                        </span>
                        <span className="block text-black text-[17px]/[120%] font-semibold truncate mt-1.5">{title}</span>
                        <span className="flex items-center gap-1.5 mt-1.5 min-w-0">
                          <span className="text-[13px]/[100%] font-medium shrink-0" style={{ color: st.fg }}>
                            {t(`requests.status.${st.key}`)}
                          </span>
                          {lead.city && (
                            <>
                              <span className="text-[#CFC7CD] shrink-0">·</span>
                              <svg className="w-3.5 h-3.5 shrink-0 text-[#A7A2AA]" viewBox="0 0 24 24" fill="none">
                                <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" />
                              </svg>
                              <span className="text-[#8A8A8A] text-[13px]/[120%] truncate">{lead.city}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <svg className="w-[18px] h-[18px] text-[#E2319B]/70 shrink-0" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )
                })}
                <button
                  onClick={() => navigate('/requests')}
                  className="self-start text-[#8A8A8A] text-[14px]/[100%] font-medium px-1 py-1 active:opacity-70 transition-opacity"
                >
                  {t('more.allRequests')} →
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/requests')}
                className="w-full flex items-center gap-2.5 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                      stroke="#777779" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-black text-[16px]/[100%] font-medium">{t('more.myRequests')}</span>
              </button>
            )}

            <button
              onClick={() => setHowItWorksOpen(true)}
              className="w-full flex items-center gap-2.5 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconQuestion />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.howItWorks')}</span>
            </button>

            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-3">
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.language')}</span>
              {(() => {
                const langs = [
                  { code: 'ru', label: 'RU' },
                  { code: 'en', label: 'EN' },
                  { code: 'zh', label: 'ZH' },
                ]
                const cur = (i18n.language || 'ru').slice(0, 2).toLowerCase()
                const active = langs.some((l) => l.code === cur) ? cur : 'ru'
                const idx = langs.findIndex((l) => l.code === active)
                const SEG = 40
                return (
                  <div className="relative flex items-center bg-white rounded-full p-0.5">
                    <span
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-[#E2319B]"
                      style={{
                        width: SEG,
                        left: 2,
                        transform: `translateX(${idx * SEG}px)`,
                        transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.55,1)',
                      }}
                    />
                    {langs.map((lng) => (
                      <button
                        key={lng.code}
                        onClick={() => setLanguage(lng.code)}
                        className="relative z-10 py-1 rounded-full text-[13px] font-semibold transition-colors duration-300 outline-none focus:outline-none focus-visible:outline-none"
                        style={{ width: SEG, color: active === lng.code ? '#fff' : '#9B9AA0' }}
                      >
                        {lng.label}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-4">
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.notifications')}</span>
              <Toggle value={notifications} onChange={handleNotificationsChange} />
            </div>
          </div>

          <div ref={section2Ref} className="flex flex-col gap-4">
            <SectionLabel>{t('more.additional')}</SectionLabel>

            <button
              onClick={() => setFaqOpen(true)}
              className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconQuestion />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.faq')}</span>
            </button>

            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconSupport />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">{t('more.support')}</span>
            </button>
          </div>

        </div>

      </section>

      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}
