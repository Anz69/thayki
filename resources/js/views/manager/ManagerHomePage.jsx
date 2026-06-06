import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import GradientBorder from '@/components/ui/GradientBorder'
import useAuthStore from '@/stores/useAuthStore'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import api from '@/utils/api'

const fmtMoney = (minor) => '฿ ' + Math.round((minor || 0) / 100).toLocaleString()

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">{children}</p>
  )
}

function MenuItem({ icon, label, badge, right, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-3 bg-[#EFEEF3] rounded-2xl px-4 py-4.5 transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-[#ECEAEC]',
      ].join(' ')}
    >
      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="text-black text-[16px]/[100%] font-medium">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        {badge > 0 && (
          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#E2319B] text-white text-[11px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {right && <span className="text-[#9B9AA0] text-[13px] font-medium">{right}</span>}
        <svg className="w-4 h-4 text-[#C4C4C4]" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}

export default function ManagerHomePage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const auth = useAuthStore()
  const [newCount, setNewCount] = useState(null)
  const [earnToday, setEarnToday] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    api.get('/manager/leads', { params: { tab: 'new' } })
      .then((r) => setNewCount(Array.isArray(r?.data?.data) ? r.data.data.length : 0))
      .catch(() => setNewCount(0))
    api.get('/manager/earnings')
      .then((r) => setEarnToday(r?.data?.data?.today ?? 0))
      .catch(() => setEarnToday(0))
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(els, { y: 20, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })

  const name = auth.user?.first_name || t('manager.title')
  const photo = auth.user?.photo_url ? resolveMediaUrl(auth.user.photo_url) : null

  return (
    <section ref={rootRef} className="flex flex-col min-h-screen bg-white">
      <div className="container flex flex-col gap-5 pt-[40px] pb-[120px]">

        {/* Greeting + avatar */}
        <div data-anim className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[#9B9AA0] text-[14px] font-medium">{t('manager.greeting')}</span>
            <h1 className="text-black text-[26px]/[110%] font-bold truncate">{name}</h1>
          </div>
          <div className="size-12 rounded-full overflow-hidden bg-[#EFEEF3] shrink-0 flex items-center justify-center">
            {photo
              ? <img src={photo} alt="" className="w-full h-full object-cover" />
              : <span className="text-[#E2319B] text-lg font-bold">{name[0]?.toUpperCase()}</span>}
          </div>
        </div>

        {/* Stats — single accent card (project style: GradientBorder) */}
        <div data-anim>
          <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-4 flex items-center">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[#ABABAB] text-[11px]/[100%] font-medium">{t('manager.statNew')}</span>
              <span className="text-[#E2319B] text-[26px]/[100%] font-bold">{newCount === null ? '…' : newCount}</span>
            </div>
            <div className="w-px self-stretch bg-black/5 mx-3" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[#ABABAB] text-[11px]/[100%] font-medium">{t('manager.statToday')}</span>
              <span className="text-black text-[26px]/[100%] font-bold">{earnToday === null ? '…' : fmtMoney(earnToday)}</span>
            </div>
          </GradientBorder>
        </div>

        {/* Panel sections */}
        <div data-anim className="flex flex-col gap-3">
          <SectionLabel>{t('manager.title')}</SectionLabel>

          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#E2319B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.leads')}
            badge={newCount ?? 0}
            onClick={() => navigate('/manager/leads')}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.support')}
            right={t('manager.soon')}
            disabled
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12M19 15l2 2-2 2" stroke="#1E9E4E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.earnings')}
            onClick={() => navigate('/manager/earnings')}
          />
        </div>
      </div>
    </section>
  )
}
