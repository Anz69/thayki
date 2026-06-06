import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'

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

export default function ManagerPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    api.get('/manager/leads', { params: { tab: 'new' } })
      .then((r) => setNewCount(Array.isArray(r?.data?.data) ? r.data.data.length : 0))
      .catch(() => {})
  }, [])

  return (
    <main className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/more')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('manager.title')}
          </span>
        </div>
      </header>

      <div className="container flex flex-col gap-3 pt-2 pb-24">
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
    </main>
  )
}
