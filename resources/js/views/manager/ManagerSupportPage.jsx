import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'

function relTime(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  const code = (lang || 'ru').slice(0, 2)
  const loc = code === 'en' ? 'en' : code === 'zh' ? 'zh' : 'ru'
  const dateLoc = loc === 'en' ? 'en-US' : loc === 'zh' ? 'zh-CN' : 'ru-RU'
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })
  if (diff < 60) return rtf.format(-Math.round(diff), 'second')
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  if (diff < 604800) return rtf.format(-Math.round(diff / 86400), 'day')
  return d.toLocaleDateString(dateLoc, { day: 'numeric', month: 'short' })
}

export default function ManagerSupportPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()
  const [items, setItems] = useState(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('unanswered')
  const rootRef = useRef(null)
  const animatedOnce = useRef(false)

  const q = search.trim().toLowerCase()
  const awaitingCount = items?.filter((it) => it.awaiting).length ?? 0
  const visible = items === null ? null : items.filter((it) => {
    const hasClient = !!(it.client?.name || it.client?.username || it.client?.id)
    if (!hasClient && !it.last_message) return false
    if (tab === 'unanswered' && !it.awaiting) return false
    if (!q) return true
    const hay = [it.client?.name, it.client?.username, it.last_message?.preview]
      .filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })

  const load = useCallback(() => {
    api.get('/manager/support')
      .then((r) => setItems(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch((e) => { logError(e); setItems([]) })
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!items?.length || animatedOnce.current) return
    animatedOnce.current = true
    const cards = rootRef.current?.querySelectorAll('[data-card]') ?? []
    gsap.fromTo(cards, { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.32, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' })
  }, [items])

  const open = (it) => {
    if (!it.chat_id) return
    const title = it.client?.name || t('manager.support')
    navigate(`/request/chat?id=${it.chat_id}&kind=support&from=${encodeURIComponent('/manager/support')}&title=${encodeURIComponent(title)}`)
  }

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full pt-4 pb-3 bg-[#FAFAFB]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/home')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">{t('manager.support')}</span>
        </div>

        <div className="container mt-3">
          <div className="flex items-center gap-2 bg-white border border-black/[0.07] rounded-full px-4 h-11 focus-within:border-[#E2319B]/60 transition-colors">
            <svg className="w-4 h-4 text-[#B7B6BC] shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('manager.searchSupportPlaceholder')}
              className="flex-1 min-w-0 bg-transparent text-black text-[14px] outline-none placeholder:text-[#B7B6BC]"
              autoComplete="off"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="shrink-0 size-5 rounded-full bg-[#ECEAF0] text-[#8B8A92] flex items-center justify-center active:scale-90 transition-transform"
                aria-label="clear"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="container mt-3">
          <div className="relative grid grid-cols-2 bg-[#EFEEF3] rounded-full p-1">
            <span
              className="absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm"
              style={{
                width: 'calc(50% - 4px)',
                transform: tab === 'all' ? 'translateX(100%)' : 'translateX(0)',
                transition: 'transform 0.32s cubic-bezier(0.34,1.45,0.5,1)',
              }}
            />
            {[['unanswered', t('manager.supportTab.unanswered')], ['all', t('manager.supportTab.all')]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="relative z-10 py-2 text-[13px] font-semibold transition-colors duration-200 inline-flex items-center justify-center gap-1.5"
                style={{ color: tab === k ? '#111' : '#9B9AA0' }}
              >
                {label}
                {k === 'unanswered' && awaitingCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E2319B] text-white text-[11px] font-bold inline-flex items-center justify-center">{awaitingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container flex flex-col gap-2.5 pt-3 pb-24">
        {items === null && [0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-black/[0.06]">
            <div className="size-12 rounded-full bg-[#ECEAF0] animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 w-1/2 rounded-full bg-[#ECEAF0] animate-pulse" />
              <div className="h-3 w-2/3 rounded-full bg-[#F0EFF4] animate-pulse" />
            </div>
          </div>
        ))}

        {items !== null && visible.length === 0 && (
          <div className="flex flex-col items-center text-center gap-3 pt-24">
            <div className="size-16 rounded-full bg-[#E9F0FF] flex items-center justify-center text-3xl">{q ? '🔍' : (tab === 'unanswered' ? '🎉' : '💬')}</div>
            <p className="text-[#9B9AA0] text-sm">
              {q ? t('manager.searchEmpty') : (tab === 'unanswered' ? t('manager.supportAllAnswered') : t('manager.supportEmpty'))}
            </p>
          </div>
        )}

        {visible?.map((it) => {
          const photo = it.client?.photo ? resolveMediaUrl(it.client.photo) : null
          return (
            <button
              key={it.chat_id}
              data-card
              onClick={() => open(it)}
              className="text-left bg-white rounded-2xl p-3.5 border border-black/[0.06] active:bg-[#FBFAFC] transition-colors flex items-center gap-3"
            >
              <div className="relative size-12 rounded-full overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                {photo
                  ? <img src={photo} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[#E2319B] text-base font-bold">{(it.client?.name || '?')[0]?.toUpperCase()}</span>}
                {it.awaiting && <span className="absolute top-0 right-0 size-3 rounded-full bg-[#E2319B] ring-2 ring-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-black text-[15px] font-semibold truncate">{it.client?.name ?? '—'}</span>
                  <span className="ml-auto text-[#ABABAB] text-[12px] shrink-0">{relTime(it.last_message?.at, i18n.language)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[13px] truncate ${it.awaiting ? 'text-black font-medium' : 'text-[#9B9AA0]'}`}>{it.last_message?.preview ?? '—'}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}
