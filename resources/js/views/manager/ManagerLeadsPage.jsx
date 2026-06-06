import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

// enum value → { i18n key, colors }
const STATUS = {
  new:              { key: 'new',             bg: '#FDE8F5', fg: '#E2319B' },
  in_progress:      { key: 'inProgress',      bg: '#FFF1DC', fg: '#C77A12' },
  awaiting_client:  { key: 'awaitingClient',  bg: '#E9F0FF', fg: '#2F6BD8' },
  awaiting_payment: { key: 'awaitingPayment', bg: '#FFF1DC', fg: '#C77A12' },
  prepaid:          { key: 'prepaid',         bg: '#EAF7EF', fg: '#1E9E4E' },
  completed:        { key: 'completed',       bg: '#E6F5EA', fg: '#1E9E4E' },
  closed:           { key: 'closed',          bg: '#EFEFF2', fg: '#7A7A80' },
}
const MANAGER_STATUSES = ['in_progress', 'awaiting_client', 'awaiting_payment', 'prepaid', 'completed', 'closed']
const TABS = ['new', 'active', 'closed', 'all']

function StatusPill({ status, onClick }) {
  const st = STATUS[status] ?? STATUS.new
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-transform active:scale-95"
      style={{ background: st.bg, color: st.fg }}
    >
      {t(`requests.status.${st.key}`)}
      {onClick && (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </button>
  )
}

export default function ManagerLeadsPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()

  const [tab, setTab] = useState('new')
  const [leads, setLeads] = useState(null)
  const [busy, setBusy] = useState(null)
  const [statusFor, setStatusFor] = useState(null) // lead whose status is being edited

  const load = useCallback((which) => {
    setLeads(null)
    api.get('/manager/leads', { params: { tab: which } })
      .then((r) => setLeads(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch((e) => { logError(e); setLeads([]) })
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  const accept = async (lead) => {
    setBusy(lead.id)
    try {
      const { data } = await api.post(`/manager/leads/${lead.id}/accept`, {}, {
        headers: { 'Idempotency-Key': `accept-${lead.id}` },
      })
      const updated = data?.data
      navigate(`/request/chat?id=${updated?.chat_id ?? lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
    } catch (e) { logError(e); setBusy(null) }
  }

  const changeStatus = async (status) => {
    const lead = statusFor
    setStatusFor(null)
    if (!lead || lead.status === status) return
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    try {
      await api.patch(`/manager/leads/${lead.id}/status`, { status })
    } catch (e) { logError(e); load(tab) }
  }

  const openChat = (lead) => {
    if (!lead.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
  }

  return (
    <main className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full pt-4 pb-2 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="container flex items-center relative">
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
        <div className="container mt-3 flex gap-2 overflow-x-auto no-scrollbar">
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

      <div className="container flex flex-col gap-3 pt-3 pb-24">
        {leads === null && [0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-black/5">
            <div className="size-12 rounded-xl bg-[#ECEAF0] animate-pulse shrink-0" />
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
            <div key={lead.id} className="flex flex-col gap-3 bg-white rounded-2xl p-3.5 border border-black/5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span className="text-lg">🔎</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-black text-[15px] font-semibold truncate">{lead.client?.name ?? '—'}</span>
                    {lead.identity_verified && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#1E9E4E" className="shrink-0"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z" /></svg>
                    )}
                  </div>
                  <div className="text-[#8A8A8A] text-[13px] mt-0.5 truncate">📍 {lead.city || '—'} · {interest}</div>
                </div>
                <StatusPill status={lead.status} onClick={isNew ? undefined : () => setStatusFor(lead)} />
              </div>

              <div className="flex items-center gap-2">
                {isNew ? (
                  <button
                    onClick={() => accept(lead)}
                    disabled={busy === lead.id}
                    className="flex-1 py-2.5 rounded-full bg-[#E2319B] text-white text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {busy === lead.id ? '…' : t('manager.accept')}
                  </button>
                ) : (
                  <button
                    onClick={() => openChat(lead)}
                    className="flex-1 py-2.5 rounded-full bg-[#1B1B1B] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
                  >
                    {t('manager.openChat')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom status picker (no native select) */}
      <ModalMiddle isOpen={statusFor !== null} onClose={() => setStatusFor(null)}>
        <div className="flex flex-col px-5 pt-1 pb-6">
          <h2 className="text-black text-lg font-semibold text-center mb-3">{t('manager.statusTitle')}</h2>
          <div className="flex flex-col gap-1">
            {MANAGER_STATUSES.map((s) => {
              const active = statusFor?.status === s
              const st = STATUS[s]
              return (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={[
                    'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-colors',
                    active ? 'bg-[#FDE8F5]' : 'active:bg-[#F5F5F7]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full" style={{ background: st.fg }} />
                    <span className="text-black text-[15px] font-medium">{t(`requests.status.${st.key}`)}</span>
                  </span>
                  {active && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#E2319B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </ModalMiddle>
    </main>
  )
}
