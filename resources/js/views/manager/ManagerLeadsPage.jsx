import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useModelPreview from '@/stores/useModelPreview'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import { STATUS, StatusChip, VerifiedMark } from './kit'

const MANAGER_STATUSES = ['in_progress', 'awaiting_client', 'awaiting_payment', 'prepaid', 'completed', 'closed']
const TABS = ['all', 'new', 'active', 'closed']

function relTime(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'ru', { numeric: 'auto' })
  if (diff < 60) return rtf.format(-Math.round(diff), 'second')
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  if (diff < 604800) return rtf.format(-Math.round(diff / 86400), 'day')
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-black/[0.06] last:border-0">
      <span className="text-[#9B9AA0] text-[13px] shrink-0">{label}</span>
      <span className="text-black text-[14px] font-medium text-right">{value}</span>
    </div>
  )
}

export default function ManagerLeadsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()
  const setPreviewModel = useModelPreview((s) => s.setModel)

  const [tab, setTab] = useState('all')
  const [leads, setLeads] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busy, setBusy] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const tabRefs = useRef({})
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })
  const rootRef = useRef(null)
  const sentinelRef = useRef(null)

  // Race-proof loading: every first-page request takes a token; only the latest
  // token's response is applied, so rapid tab switching never lands on the wrong
  // tab. Per-tab cache makes switching back instant (no skeleton, no refetch).
  const reqIdRef = useRef(0)
  const appendingRef = useRef(false)
  const cacheRef = useRef({})
  const tabRef = useRef(tab)
  tabRef.current = tab

  // Load page 1 for a tab. Shows cached data instantly if we have it (so the
  // switch is immediate), otherwise a skeleton; then reconciles with the server.
  const loadFirst = useCallback(async (which, { refresh = false } = {}) => {
    const token = ++reqIdRef.current
    const cached = cacheRef.current[which]
    if (cached && !refresh) {
      setLeads(cached.leads); setPage(cached.page); setHasMore(cached.hasMore)
    } else if (!cached && !refresh) {
      setLeads(null); setPage(1); setHasMore(false)
    }
    // On refresh we keep whatever's on screen and just reconcile below.
    try {
      const { data } = await api.get('/manager/leads', { params: { tab: which, page: 1, per_page: 20 } })
      if (token !== reqIdRef.current) return // superseded by a newer switch
      const items = Array.isArray(data?.data) ? data.data : []
      const meta = data?.meta?.pagination
      const more = meta ? meta.page < meta.last_page : false
      cacheRef.current[which] = { leads: items, page: 1, hasMore: more }
      setLeads(items); setPage(1); setHasMore(more)
    } catch (e) {
      logError(e)
      if (token === reqIdRef.current && !cached) setLeads([])
    }
  }, [])

  // Append the next page (infinite scroll) for the tab currently in view.
  const loadMore = useCallback(async () => {
    const which = tabRef.current
    const cur = cacheRef.current[which]
    if (appendingRef.current || !cur?.hasMore) return
    appendingRef.current = true
    setLoadingMore(true)
    const nextPage = cur.page + 1
    try {
      const { data } = await api.get('/manager/leads', { params: { tab: which, page: nextPage, per_page: 20 } })
      if (which !== tabRef.current) return // user switched away mid-append
      const items = Array.isArray(data?.data) ? data.data : []
      const meta = data?.meta?.pagination
      const more = meta ? meta.page < meta.last_page : false
      const merged = [...cur.leads, ...items]
      cacheRef.current[which] = { leads: merged, page: nextPage, hasMore: more }
      setLeads(merged); setPage(nextPage); setHasMore(more)
    } catch (e) { logError(e) }
    finally { appendingRef.current = false; setLoadingMore(false) }
  }, [])

  // Drop the cache and refetch the active tab (after status changes etc.).
  const reload = useCallback(() => loadFirst(tabRef.current, { refresh: true }), [loadFirst])

  // Tab change → load that tab (instant from cache, else skeleton).
  useEffect(() => { loadFirst(tab) }, [tab, loadFirst])

  // Slide the active-tab pill to the selected segment (animated via CSS).
  useLayoutEffect(() => {
    const el = tabRefs.current[tab]
    if (!el) return
    setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
  }, [tab, i18n.language])

  // Infinite scroll via a bottom sentinel.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) loadMore()
    }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore])

  const openChat = (lead) => {
    if (!lead.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
  }

  const accept = async (lead, e) => {
    e?.stopPropagation()
    setBusy(lead.id)
    try {
      const { data } = await api.post(`/manager/leads/${lead.id}/accept`, {}, { headers: { 'Idempotency-Key': `accept-${lead.id}` } })
      const updated = data?.data
      navigate(`/request/chat?id=${updated?.chat_id ?? lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
    } catch (err) { logError(err); setBusy(null) }
  }

  const changeStatus = async (status) => {
    const lead = viewing
    setStatusOpen(false)
    if (!lead || lead.status === status) return
    setViewing((v) => (v ? { ...v, status } : v))
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    try { await api.patch(`/manager/leads/${lead.id}/status`, { status }) }
    catch (e) { logError(e) }
    // The lead may now belong to a different tab — drop all caches and refetch
    // the active one so membership stays correct.
    cacheRef.current = {}
    reload()
  }

  const openModal = (lead) => { setViewing(lead); setStatusOpen(false); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setStatusOpen(false) }
  // Open the model profile as a full page (same as the chat) — no nested modal.
  const openModelView = (model) => {
    if (!model) return
    setModalOpen(false)
    setPreviewModel(model)
    navigate('/model-view')
  }

  // Quick staggered entry — runs whenever the keyed list (re)mounts, i.e. on
  // every tab switch. Lightweight WAAPI, no GSAP race with rapid switching.
  const listAnimRef = useCallback((el) => {
    if (!el || typeof el.querySelectorAll !== 'function') return
    el.querySelectorAll('[data-card]').forEach((c, i) => {
      if (typeof c.animate !== 'function') return
      c.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 240, delay: Math.min(i, 8) * 28, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'backwards' },
      )
    })
  }, [])

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
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">{t('manager.leads')}</span>
        </div>
        <div className="container mt-3">
          <div className="relative flex p-1 bg-[#EFEEF3] rounded-full">
            {/* Sliding active background */}
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full bg-[#E2319B] shadow-[0_2px_10px_rgba(226,49,155,0.35)]"
              style={{
                left: pill.left,
                width: pill.width,
                opacity: pill.ready ? 1 : 0,
                transition: 'left 0.32s cubic-bezier(0.34,1.3,0.5,1), width 0.32s cubic-bezier(0.34,1.3,0.5,1), opacity 0.2s',
              }}
            />
            {TABS.map((x) => (
              <button
                key={x}
                ref={(el) => { tabRefs.current[x] = el }}
                onClick={() => setTab(x)}
                className={[
                  'relative z-10 flex-1 px-2 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors duration-200',
                  tab === x ? 'text-white' : 'text-[#8B8A92] active:text-[#5B5A62]',
                ].join(' ')}
              >
                {t(`manager.tab.${x}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container flex flex-col gap-2.5 pt-3 pb-24">
        {leads === null && [0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-black/[0.06]">
            <div className="size-12 rounded-2xl bg-[#ECEAF0] animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 w-1/2 rounded-full bg-[#ECEAF0] animate-pulse" />
              <div className="h-3 w-1/3 rounded-full bg-[#F0EFF4] animate-pulse" />
            </div>
          </div>
        ))}

        {leads !== null && leads.length === 0 && (
          <div className="flex flex-col items-center text-center gap-3 pt-24">
            <div className="size-16 rounded-full bg-[#FDE8F5] flex items-center justify-center text-3xl">📭</div>
            <p className="text-[#9B9AA0] text-sm">{t('manager.empty')}</p>
          </div>
        )}

        {leads?.length > 0 && (
        <div key={tab} ref={listAnimRef} className="flex flex-col gap-2.5">
        {leads.map((lead) => {
          const clientPhoto = lead.client?.photo ? resolveMediaUrl(lead.client.photo) : null
          const modelPhoto = lead.model?.photo ? resolveMediaUrl(lead.model.photo) : null
          const interest = lead.model ? modelName(lead.model) : `${t('requestChat.title')} #${lead.id}`
          const isNew = lead.status === 'new'
          return (
            <div
              key={lead.id}
              data-card
              onClick={() => openModal(lead)}
              className="bg-white rounded-2xl p-3.5 border border-black/[0.06] active:bg-[#FBFAFC] transition-colors cursor-pointer"
            >
              <div className="flex gap-3">
                <div className="size-12 rounded-full overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {clientPhoto
                    ? <img src={clientPhoto} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[#E2319B] text-base font-bold">{(lead.client?.name || '?')[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-black text-[15px] font-semibold truncate">{lead.client?.name ?? '—'}</span>
                    {lead.identity_verified && <VerifiedMark />}
                    <span className="ml-auto shrink-0 text-[#B7B6BC] text-[11px] font-medium">{relTime(lead.created_at, i18n.language)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#9B9AA0] text-[13px] mt-1 min-w-0">
                    <span className="shrink-0">📍 {lead.city || '—'}</span>
                    <span className="shrink-0">·</span>
                    {modelPhoto && <img src={modelPhoto} alt="" className="size-4 rounded-[5px] object-cover object-top shrink-0" />}
                    <span className="truncate">{interest}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusChip status={lead.status} />
                    {isNew && (
                      <button
                        onClick={(e) => accept(lead, e)}
                        disabled={busy === lead.id}
                        className="ml-auto px-4 py-1.5 rounded-full bg-[#E2319B] text-white text-[12px] font-semibold active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {busy === lead.id ? '…' : t('manager.accept')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>
        )}

        {/* Infinite-scroll sentinel + loader */}
        {leads !== null && leads.length > 0 && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {loadingMore && <div className="w-5 h-5 rounded-full border-2 border-[#E2319B] border-t-transparent animate-spin" />}
          </div>
        )}
      </div>

      {/* Lead review */}
      <ModalMiddle isOpen={modalOpen} onClose={closeModal} onAfterClose={() => setViewing(null)}>
        {viewing && (() => {
          const clientPhoto = viewing.client?.photo ? resolveMediaUrl(viewing.client.photo) : null
          const modelPhoto = viewing.model?.photo ? resolveMediaUrl(viewing.model.photo) : null
          const interest = viewing.model ? modelName(viewing.model) : `${t('requestChat.title')} #${viewing.id}`
          const isNew = viewing.status === 'new'
          return (
            <div className="relative flex flex-col px-5 pt-1 pb-6 gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-black text-lg font-bold">{t('requestChat.title')} #{viewing.id}</h2>
                {isNew ? (
                  <StatusChip status={viewing.status} />
                ) : (
                  <button onClick={() => setStatusOpen((v) => !v)} className="flex items-center gap-1 active:scale-95 transition-transform">
                    <StatusChip status={viewing.status} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="m6 9 6 6 6-6" stroke="#9B9AA0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                )}
              </div>

              {/* Client */}
              <div className="flex items-center gap-3">
                <div className="size-[52px] rounded-full overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center ring-1 ring-black/[0.04]">
                  {clientPhoto
                    ? <img src={clientPhoto} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[#E2319B] text-lg font-bold">{(viewing.client?.name || '?')[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-black text-[16px] font-bold truncate">{viewing.client?.name ?? '—'}</span>
                    {viewing.identity_verified && <VerifiedMark size={15} />}
                  </span>
                  {viewing.client?.username && <span className="text-[#9B9AA0] text-[13px]">@{viewing.client.username}</span>}
                  {viewing.client?.phone && (
                    <a href={`tel:${viewing.client.phone}`} className="text-[#2F6BD8] text-[13px] font-medium mt-0.5">{viewing.client.phone}</a>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="bg-[#F5F5F7] rounded-2xl px-4 py-1.5">
                <InfoRow label={t('request.city')} value={viewing.city} />
                {viewing.model && (
                  <button onClick={() => openModelView(viewing.model)} className="w-full flex items-center justify-between gap-4 py-2.5 border-b border-black/[0.06] text-left active:opacity-60 transition-opacity">
                    <span className="text-[#9B9AA0] text-[13px] shrink-0">{t('manager.interested')}</span>
                    <span className="flex items-center gap-2 min-w-0">
                      {modelPhoto && <img src={modelPhoto} alt="" className="size-5 rounded-[6px] object-cover object-top shrink-0" />}
                      <span className="text-black text-[14px] font-medium truncate">{interest}</span>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-[#C4C4C4] shrink-0"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </button>
                )}
                <InfoRow label={t('request.hairType')} value={viewing.hair_type} />
                <InfoRow label={t('request.age')} value={viewing.age_range} />
                <InfoRow label={t('request.height')} value={viewing.height_range} />
                <InfoRow label={t('request.goal')} value={viewing.goal} />
                <InfoRow label={t('request.wishes')} value={viewing.wishes} />
                <InfoRow label={t('manager.created')} value={relTime(viewing.created_at, i18n.language)} />
              </div>

              {isNew ? (
                <button onClick={(e) => accept(viewing, e)} disabled={busy === viewing.id} className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
                  {busy === viewing.id ? '…' : t('manager.accept')}
                </button>
              ) : (
                <button onClick={() => openChat(viewing)} className="w-full py-4 rounded-full bg-[#1B1B1B] text-white text-base font-semibold active:scale-[0.98] transition-transform">
                  {t('manager.openChat')}
                </button>
              )}

              {/* Status selector — opens from the chip at the top-right, overlays content */}
              {!isNew && statusOpen && (
                <>
                  <div className="absolute inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="absolute right-5 top-10 z-20 w-[228px] rounded-2xl bg-white border border-black/[0.06] overflow-hidden shadow-[0_16px_44px_rgba(0,0,0,0.18)]">
                    {MANAGER_STATUSES.map((s, i) => {
                      const active = viewing.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          className={['w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors', i > 0 ? 'border-t border-black/[0.05]' : '', active ? 'bg-[#FDE8F5]' : 'active:bg-[#F7F6FA]'].join(' ')}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="size-2 rounded-full" style={{ background: STATUS[s].dot }} />
                            <span className={`text-[14px] ${active ? 'text-[#C01A7E] font-semibold' : 'text-black font-medium'}`}>{t(`requests.status.${STATUS[s].key}`)}</span>
                          </span>
                          {active && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#E2319B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </ModalMiddle>
    </main>
  )
}
