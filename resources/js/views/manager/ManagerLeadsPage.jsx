import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

const STATUS = {
  new:              { key: 'new',             bg: '#FDE8F5', fg: '#E2319B', dot: '#E2319B' },
  in_progress:      { key: 'inProgress',      bg: '#FFF1DC', fg: '#C77A12', dot: '#C77A12' },
  awaiting_client:  { key: 'awaitingClient',  bg: '#E9F0FF', fg: '#2F6BD8', dot: '#2F6BD8' },
  awaiting_payment: { key: 'awaitingPayment', bg: '#FFF1DC', fg: '#C77A12', dot: '#C77A12' },
  prepaid:          { key: 'prepaid',         bg: '#EAF7EF', fg: '#1E9E4E', dot: '#1E9E4E' },
  completed:        { key: 'completed',       bg: '#E6F5EA', fg: '#1E9E4E', dot: '#1E9E4E' },
  closed:           { key: 'closed',          bg: '#EFEFF2', fg: '#7A7A80', dot: '#A9A7AE' },
}
const MANAGER_STATUSES = ['in_progress', 'awaiting_client', 'awaiting_payment', 'prepaid', 'completed', 'closed']
const TABS = ['new', 'active', 'closed', 'all']

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

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const st = STATUS[status] ?? STATUS.new
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.fg }}>
      <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
      {t(`requests.status.${st.key}`)}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-black/5 last:border-0">
      <span className="text-[#8A8A8A] text-[13px] shrink-0">{label}</span>
      <span className="text-black text-[14px] font-medium text-right">{value}</span>
    </div>
  )
}

export default function ManagerLeadsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()

  const [tab, setTab] = useState('new')
  const [leads, setLeads] = useState(null)
  const [busy, setBusy] = useState(null)
  const [viewing, setViewing] = useState(null)     // lead shown in the info modal
  const [statusOpen, setStatusOpen] = useState(false)
  const rootRef = useRef(null)

  const load = useCallback((which) => {
    setLeads(null)
    api.get('/manager/leads', { params: { tab: which } })
      .then((r) => setLeads(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch((e) => { logError(e); setLeads([]) })
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  usePageReady(() => {
    const head = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(head, { y: -12, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' })
  })

  // Stagger the cards in whenever a tab's data arrives.
  useEffect(() => {
    if (!leads?.length) return
    const cards = rootRef.current?.querySelectorAll('[data-card]') ?? []
    gsap.fromTo(cards, { y: 16, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' })
  }, [leads])

  const openChat = (lead) => {
    if (!lead.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
  }

  const accept = async (lead, e) => {
    e?.stopPropagation()
    setBusy(lead.id)
    try {
      const { data } = await api.post(`/manager/leads/${lead.id}/accept`, {}, {
        headers: { 'Idempotency-Key': `accept-${lead.id}` },
      })
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
    catch (e) { logError(e); load(tab) }
  }

  const closeModal = () => { setViewing(null); setStatusOpen(false) }

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full pt-4 pb-2 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-40">
        <div data-anim className="container flex items-center relative">
          <button
            onClick={() => navigate('/home')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('manager.leads')}
          </span>
        </div>
        <div data-anim className="container mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={[
                'px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95',
                tab === x ? 'bg-[#E2319B] text-white' : 'bg-[#EFEEF3] text-[#7A7A80]',
              ].join(' ')}
            >
              {t(`manager.tab.${x}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="container flex flex-col gap-2.5 pt-3 pb-24">
        {leads === null && [0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-black/5">
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
            <p className="text-[#8A8A8A] text-sm">{t('manager.empty')}</p>
          </div>
        )}

        {leads?.map((lead) => {
          const photo = lead.model?.photo ? resolveMediaUrl(lead.model.photo) : null
          const interest = lead.model ? modelName(lead.model) : t('requests.viaForm')
          const isNew = lead.status === 'new'
          return (
            <div
              key={lead.id}
              data-card
              onClick={() => { setViewing(lead); setStatusOpen(false) }}
              className="bg-white rounded-2xl p-3.5 border border-black/5 active:bg-[#FAFAFB] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span className="text-lg">🔎</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-black text-[15px] font-semibold truncate">{lead.client?.name ?? '—'}</span>
                    {lead.identity_verified && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#1E9E4E" className="shrink-0"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z" /></svg>
                    )}
                    <span className="ml-auto shrink-0 text-[#B7B6BC] text-[11px] font-medium">{relTime(lead.created_at, i18n.language)}</span>
                  </div>
                  <div className="text-[#8A8A8A] text-[13px] mt-0.5 truncate">📍 {lead.city || '—'} · {interest}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={lead.status} />
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

      {/* Lead review modal */}
      <ModalMiddle isOpen={viewing !== null} onClose={closeModal}>
        {viewing && (() => {
          const photo = viewing.model?.photo ? resolveMediaUrl(viewing.model.photo) : null
          const interest = viewing.model ? modelName(viewing.model) : t('requests.viaForm')
          const isNew = viewing.status === 'new'
          return (
            <div className="flex flex-col px-5 pt-1 pb-6 gap-4">
              <h2 className="text-black text-lg font-semibold text-center">{t('requestChat.title')} #{viewing.id}</h2>

              {/* Client */}
              <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl p-3">
                <div className="size-12 rounded-2xl overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span className="text-lg">🔎</span>}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-black text-[15px] font-semibold truncate">{viewing.client?.name ?? '—'}</span>
                    {viewing.identity_verified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1E9E4E"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z" /></svg>
                    )}
                  </span>
                  {viewing.client?.username && <span className="text-[#8A8A8A] text-[13px]">@{viewing.client.username}</span>}
                </div>
              </div>

              {/* Info */}
              <div className="bg-[#F5F5F7] rounded-2xl px-4 py-1">
                <InfoRow label={t('request.city')} value={viewing.city} />
                <InfoRow label={t('request.interested')} value={viewing.model ? interest : null} />
                <InfoRow label={t('request.hairType')} value={viewing.hair_type} />
                <InfoRow label={t('request.age')} value={viewing.age_range} />
                <InfoRow label={t('request.height')} value={viewing.height_range} />
                <InfoRow label={t('request.goal')} value={viewing.goal} />
                <InfoRow label={t('request.wishes')} value={viewing.wishes} />
                <InfoRow label={t('manager.created')} value={relTime(viewing.created_at, i18n.language)} />
              </div>

              {/* Status (dropdown list, not a separate modal) */}
              {isNew ? (
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A] text-[13px]">{t('manager.statusTitle')}</span>
                  <StatusBadge status={viewing.status} />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setStatusOpen((v) => !v)}
                    className="w-full flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-3.5"
                  >
                    <span className="text-[#8A8A8A] text-[13px]">{t('manager.statusTitle')}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={viewing.status} />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="m6 9 6 6 6-6" stroke="#9B9AA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </button>
                  {statusOpen && (
                    <div className="flex flex-col gap-0.5 bg-white rounded-2xl border border-black/5 p-1 overflow-hidden">
                      {MANAGER_STATUSES.map((s) => {
                        const active = viewing.status === s
                        const st = STATUS[s]
                        return (
                          <button
                            key={s}
                            onClick={() => changeStatus(s)}
                            className={['w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-colors', active ? 'bg-[#FDE8F5]' : 'active:bg-[#F5F5F7]'].join(' ')}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="size-2.5 rounded-full" style={{ background: st.dot }} />
                              <span className="text-black text-[15px] font-medium">{t(`requests.status.${st.key}`)}</span>
                            </span>
                            {active && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#E2319B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {isNew ? (
                <button
                  onClick={(e) => accept(viewing, e)}
                  disabled={busy === viewing.id}
                  className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {busy === viewing.id ? '…' : t('manager.accept')}
                </button>
              ) : (
                <button
                  onClick={() => openChat(viewing)}
                  className="w-full py-4 rounded-full bg-[#1B1B1B] text-white text-base font-semibold active:scale-[0.98] transition-transform"
                >
                  {t('manager.openChat')}
                </button>
              )}
            </div>
          )
        })()}
      </ModalMiddle>
    </main>
  )
}
