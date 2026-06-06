import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'

const fmtMoney = (minor) => '฿ ' + Math.round((minor || 0) / 100).toLocaleString()

function Card({ icon, tint, label, hint, badge, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-3.5 bg-white rounded-2xl px-4 py-4 text-left transition-transform',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] shadow-[0_2px_10px_rgba(0,0,0,0.05)]',
      ].join(' ')}
    >
      <span className="flex items-center justify-center size-11 rounded-2xl shrink-0" style={{ background: tint }}>{icon}</span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="text-black text-[16px]/[120%] font-semibold">{label}</span>
        {hint && <span className="text-[#8A8A8A] text-[12px]/[130%] mt-0.5">{hint}</span>}
      </span>
      {badge > 0 && (
        <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#E2319B] text-white text-[12px] font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <svg className="w-4 h-4 text-[#C4C4C4] shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function ManagerHomePage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const auth = useAuthStore()
  const [newCount, setNewCount] = useState(0)
  const [earnToday, setEarnToday] = useState(null)

  const rootRef = useRef(null)

  useEffect(() => {
    api.get('/manager/leads', { params: { tab: 'new' } })
      .then((r) => setNewCount(Array.isArray(r?.data?.data) ? r.data.data.length : 0))
      .catch(() => {})
    api.get('/manager/earnings')
      .then((r) => setEarnToday(r?.data?.data?.today ?? 0))
      .catch(() => {})
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(els, { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' })
  })

  const name = auth.user?.first_name || t('manager.title')

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <div className="container flex flex-col gap-4 pt-[40px] pb-[120px]">
        <div data-anim className="flex flex-col gap-0.5">
          <span className="text-[#8A8A8A] text-[13px] font-medium">{t('manager.greeting')}</span>
          <h1 className="text-black text-[26px]/[110%] font-bold">{name}</h1>
        </div>

        {/* Quick stats */}
        <div data-anim className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-[#E2319B] text-white flex flex-col gap-1">
            <span className="text-white/80 text-[12px] font-medium">{t('manager.tab.new')}</span>
            <span className="text-[24px]/[100%] font-bold">{newCount}</span>
          </div>
          <div className="rounded-2xl p-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-1">
            <span className="text-[#9B9AA0] text-[12px] font-medium">{t('manager.earn.today')}</span>
            <span className="text-[24px]/[100%] font-bold text-black">{earnToday === null ? '…' : fmtMoney(earnToday)}</span>
          </div>
        </div>

        <div data-anim className="flex flex-col gap-3">
          <Card
            tint="#FDE8F5"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#E2319B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.leads')}
            hint={t('manager.leadsHint')}
            badge={newCount}
            onClick={() => navigate('/manager/leads')}
          />
          <Card
            tint="#E9F0FF"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.support')}
            hint={t('manager.soon')}
            disabled
          />
          <Card
            tint="#EAF7EF"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12M19 15l2 2-2 2" stroke="#1E9E4E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.earnings')}
            hint={t('manager.earningsHint')}
            onClick={() => navigate('/manager/earnings')}
          />
        </div>
      </div>
    </main>
  )
}
