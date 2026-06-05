import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

const STATUS = {
  new:         { key: 'new',        bg: '#FDE8F5', fg: '#E2319B' },
  in_progress: { key: 'inProgress', bg: '#FFF1DC', fg: '#C77A12' },
  closed:      { key: 'closed',     bg: '#E6F5EA', fg: '#1E9E4E' },
}

function fmtDate(iso, lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export default function RequestsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()

  const [leads, setLeads] = useState(null) // null = loading
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.get('/leads')
      .then((r) => { if (!cancelled) setLeads(Array.isArray(r?.data?.data) ? r.data.data : []) })
      .catch((e) => { if (!cancelled) { logError(e); setLeads([]) } })
    return () => { cancelled = true }
  }, [])

  // Single, gentle reveal once data arrives (no second/competing animation, so
  // the screen never looks like it "lags" or double-animates on open).
  useEffect(() => {
    if (leads === null) return
    const items = rootRef.current?.querySelectorAll('[data-item]') ?? []
    if (items.length) {
      gsap.fromTo(items,
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' })
    } else {
      const empty = rootRef.current?.querySelector('[data-empty]')
      if (empty) gsap.fromTo(empty, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' })
    }
  }, [leads])

  const open = (lead) => {
    if (!lead.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/requests')}`)
  }

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/more')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('requests.title')}
          </span>
        </div>
      </header>

      <div className="container flex flex-col gap-3 pt-3 pb-24">
        {leads === null && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                style={{ opacity: 1 - i * 0.18 }}
              >
                <div className="size-14 rounded-xl bg-[#ECEAF0] animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-1/2 rounded-full bg-[#ECEAF0] animate-pulse" />
                  <div className="h-3 w-1/3 rounded-full bg-[#F0EFF4] animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded-full bg-[#F3F2F6] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {leads !== null && leads.length === 0 && (
          <div data-empty className="flex flex-col items-center text-center gap-4 pt-24">
            <div className="size-16 rounded-full bg-[#FDE8F5] flex items-center justify-center text-3xl">📩</div>
            <div className="flex flex-col gap-1">
              <p className="text-black text-[17px] font-semibold">{t('requests.emptyTitle')}</p>
              <p className="text-[#8A8A8A] text-sm max-w-[260px]">{t('requests.emptySubtitle')}</p>
            </div>
            <button
              onClick={() => navigate('/request')}
              className="mt-1 px-6 py-3 rounded-full bg-[#E2319B] text-white text-sm font-semibold active:opacity-80 transition"
            >
              {t('requests.createCta')}
            </button>
          </div>
        )}

        {leads?.map((lead) => {
          const st = STATUS[lead.status] ?? STATUS.new
          const m = lead.model
          const photo = m?.photo ? resolveMediaUrl(m.photo) : null
          const interest = m ? modelName(m) : null
          return (
            <button
              key={lead.id}
              data-item
              onClick={() => open(lead)}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:bg-[#F7F6FA] transition-colors"
            >
              {m && (
                <div className="size-14 rounded-xl overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {photo
                    ? <img src={photo} alt="" className="w-full h-full object-cover object-top" />
                    : <span className="text-xl">✨</span>}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-black text-[15px] font-semibold truncate">
                    {interest || t('requests.viaForm')}
                  </span>
                  <span
                    className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {t(`requests.status.${st.key}`)}
                  </span>
                </div>
                <div className="text-[#8A8A8A] text-[13px] mt-0.5 truncate">
                  📍 {lead.city || '—'}
                </div>
                <div className="text-[#B7B6BC] text-[11px] mt-0.5">
                  {fmtDate(lead.created_at, i18n.language)}
                </div>
              </div>
              <svg className="w-4 h-4 text-[#C4C4C4] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </div>
    </main>
  )
}
