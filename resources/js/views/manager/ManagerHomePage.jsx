import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useAuthStore from '@/stores/useAuthStore'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import api from '@/utils/api'

const fmtMoney = (minor) => '฿ ' + Math.round((minor || 0) / 100).toLocaleString()

function SectionRow({ icon, tint, label, hint, badge, onClick, disabled, divider }) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className={[
          'w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-[#F7F6FA]',
        ].join(' ')}
      >
        <span className="flex items-center justify-center size-11 rounded-2xl shrink-0" style={{ background: tint }}>{icon}</span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-black text-[16px]/[120%] font-semibold">{label}</span>
          {hint && <span className="text-[#9B9AA0] text-[12px]/[130%] mt-0.5">{hint}</span>}
        </span>
        {badge > 0 && (
          <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#E2319B] text-white text-[12px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <svg className="w-[18px] h-[18px] text-[#CFCED4] shrink-0" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {divider && <div className="h-px bg-[#F0EFF3] ml-[68px]" />}
    </>
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
      { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })

  const name = auth.user?.first_name || t('manager.title')
  const photo = auth.user?.photo_url ? resolveMediaUrl(auth.user.photo_url) : null

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#F4F3F7]">
      <div className="container flex flex-col gap-5 pt-[44px] pb-[120px]">

        {/* Greeting + avatar */}
        <div data-anim className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[#9B9AA0] text-[14px] font-medium">{t('manager.greeting')}</span>
            <h1 className="text-black text-[28px]/[105%] font-bold truncate">{name}</h1>
          </div>
          <div className="size-12 rounded-full overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] shrink-0 flex items-center justify-center">
            {photo
              ? <img src={photo} alt="" className="w-full h-full object-cover" />
              : <span className="text-[#E2319B] text-lg font-bold">{name[0]?.toUpperCase()}</span>}
          </div>
        </div>

        {/* Stats */}
        <div data-anim className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/manager/leads')}
            className="relative overflow-hidden rounded-3xl p-4 text-left text-white active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #E2319B 0%, #C01A7E 100%)', boxShadow: '0 10px 24px rgba(226,49,155,0.30)' }}
          >
            <svg className="absolute -right-3 -bottom-3 opacity-20" width="92" height="92" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-white/85 text-[12px] font-medium">{t('manager.statNew')}</span>
            <div className="mt-2 text-[34px]/[100%] font-extrabold">{newCount === null ? '…' : newCount}</div>
          </button>

          <div className="relative overflow-hidden rounded-3xl p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <span className="text-[#9B9AA0] text-[12px] font-medium">{t('manager.statToday')}</span>
            <div className="mt-2 text-[26px]/[105%] font-extrabold text-black">{earnToday === null ? '…' : fmtMoney(earnToday)}</div>
            <span className="mt-1 inline-block text-[#1E9E4E] text-[11px] font-semibold">{t('manager.earnings')}</span>
          </div>
        </div>

        {/* Sections — grouped card */}
        <div data-anim className="rounded-3xl bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
          <SectionRow
            tint="#FDE8F5" divider
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#E2319B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.leads')} hint={t('manager.leadsHint')} badge={newCount ?? 0}
            onClick={() => navigate('/manager/leads')}
          />
          <SectionRow
            tint="#E9F0FF" divider disabled
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.support')} hint={t('manager.soon')}
          />
          <SectionRow
            tint="#EAF7EF"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12M19 15l2 2-2 2" stroke="#1E9E4E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.earnings')} hint={t('manager.earningsHint')}
            onClick={() => navigate('/manager/earnings')}
          />
        </div>
      </div>
    </main>
  )
}
