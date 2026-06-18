import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import GradientBorder from '@/components/ui/GradientBorder'
import useAuthStore from '@/stores/useAuthStore'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { SectionLabel, Chevron } from './kit'

const fmtMoney = (minor) => '$ ' + Math.round((minor || 0) / 100).toLocaleString()

function MenuItem({ icon, label, badge, right, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-2.5 bg-[#EFEEF3] rounded-xl px-4 py-4.5 transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-[#ECEAEC]',
      ].join(' ')}
    >
      <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="text-black text-[16px]/[100%] font-medium">{label}</span>
      <span className="ml-auto flex items-center gap-2">
        {badge > 0 && (
          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#E2319B] text-white text-[11px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {right && <span className="text-[#9B9AA0] text-[13px] font-medium">{right}</span>}
        <Chevron />
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
  const [supportCount, setSupportCount] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    api.get('/manager/leads', { params: { tab: 'new', per_page: 1 } })
      .then((r) => setNewCount(r?.data?.meta?.pagination?.total ?? (Array.isArray(r?.data?.data) ? r.data.data.length : 0)))
      .catch(() => setNewCount(0))
    api.get('/manager/earnings')
      .then((r) => setEarnToday(r?.data?.data?.today ?? 0)).catch(() => setEarnToday(0))
    api.get('/manager/support')
      .then((r) => setSupportCount((Array.isArray(r?.data?.data) ? r.data.data : []).filter((c) => c.awaiting).length))
      .catch(() => setSupportCount(0))
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(els, { y: 20, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })

  const openRequisites = () => {
    api.get('/chats/requisites')
      .then((r) => {
        const id = r?.data?.data?.id
        if (id) navigate(`/request/chat?id=${id}&kind=requisites&from=${encodeURIComponent('/home')}&title=${encodeURIComponent(t('requisites.chatTitle'))}`)
      })
      .catch(logError)
  }

  const name = auth.user?.first_name || t('manager.title')
  const photo = auth.user?.photo_url ? resolveMediaUrl(auth.user.photo_url) : null

  return (
    <section ref={rootRef} className="flex flex-col min-h-screen bg-white">
      <div className="flex flex-col gap-5 container pt-[40px] pb-[120px]">

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

        <div data-anim>
          <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-4 flex items-center">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[#ABABAB] text-[11px]/[100%] font-medium">{t('manager.statNew')}</span>
              <span className="text-[#E2319B] text-[26px] leading-tight font-bold">{newCount == null ? '…' : newCount}</span>
            </div>
            <div className="w-px self-stretch bg-black/5 mx-3" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[#ABABAB] text-[11px]/[100%] font-medium">{t('manager.statToday')}</span>
              <span className="text-black text-[26px] leading-tight font-bold">{earnToday == null ? '…' : fmtMoney(earnToday)}</span>
            </div>
          </GradientBorder>
        </div>

        <div data-anim className="flex flex-col gap-3">
          <SectionLabel>{t('manager.title')}</SectionLabel>
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#777779" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            label={t('manager.leads')} badge={newCount ?? 0}
            onClick={() => navigate('/manager/leads')}
          />
          <MenuItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><g clip-path="url(#clip_sup_more)"><path d="M4.875 15.2462L7.59984 12.5213M5.41959 10.459L2.81934 13.0592M5.41959 7.54085L2.75368 4.87493M4.91103 2.78965L7.37132 5.24993M13.0377 15.1589L10.5173 12.6386M12.5803 10.459L15.1736 13.0523M13.125 2.75354L10.5173 5.36124M12.6213 7.49993L15.1913 4.92984M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9ZM12.75 8.99998C12.75 11.071 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.071 5.25 8.99998C5.25 6.92891 6.92893 5.24998 9 5.24998C11.0711 5.24998 12.75 6.92891 12.75 8.99998Z" stroke="#777779" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g><defs><clipPath id="clip_sup_more"><rect width="18" height="18" fill="white"></rect></clipPath></defs></svg>}
            label={t('manager.support')} badge={supportCount ?? 0}
            onClick={() => navigate('/manager/support')}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="#777779" strokeWidth="1.6" /><circle cx="12" cy="12" r="2.3" stroke="#777779" strokeWidth="1.6" /><path d="M6 9.5h.01M18 14.5h.01" stroke="#777779" strokeWidth="1.7" strokeLinecap="round" /></svg>}
            label={t('manager.earnings')}
            onClick={() => navigate('/manager/earnings')}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#777779" strokeWidth="1.6" /><path d="M3 9h18" stroke="#777779" strokeWidth="1.6" /><path d="M6.5 15h4" stroke="#777779" strokeWidth="1.7" strokeLinecap="round" /></svg>}
            label={t('manager.requisitesLink')}
            onClick={openRequisites}
          />
        </div>
      </div>
    </section>
  )
}
