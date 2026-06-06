import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
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

export default function ManagerLeadsPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()

  const [tab, setTab] = useState('new')
  const [leads, setLeads] = useState(null)
  const [busy, setBusy] = useState(null)

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

  const changeStatus = async (lead, status) => {
    try {
      await api.patch(`/manager/leads/${lead.id}/status`, { status })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    } catch (e) { logError(e) }
  }

  const openChat = (lead) => {
    if (!lead.chat_id) return
    navigate(`/request/chat?id=${lead.chat_id}&lead=${lead.id}&from=${encodeURIComponent('/manager/leads')}`)
  }

  return (
    <main className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/manager')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('manager.leads')}
          </span>
        </div>
        <div className="container mt-3 flex gap-2 overflow-x-auto">
          {TABS.map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={[
                'px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
                tab === x ? 'bg-[#E2319B] text-white' : 'bg-white text-[#7A7A80] border border-black/5',
              ].join(' ')}
            >
              {t(`manager.tab.${x}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="container flex flex-col gap-3 pt-3 pb-24">
        {leads === null && [0, 1, 2].map((i) => (
          <div key={i} className="h-[92px] rounded-2xl bg-[#F0EFF4] animate-pulse" />
        ))}

        {leads !== null && leads.length === 0 && (
          <p className="text-center text-[#8A8A8A] text-sm pt-16">{t('manager.empty')}</p>
        )}

        {leads?.map((lead) => {
          const st = STATUS[lead.status] ?? STATUS.new
          const photo = lead.model?.photo ? resolveMediaUrl(lead.model.photo) : null
          const interest = lead.model ? modelName(lead.model) : t('requests.viaForm')
          return (
            <div key={lead.id} className="flex flex-col gap-3 bg-white rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl overflow-hidden bg-[#EFEAEE] shrink-0 flex items-center justify-center">
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span>🔎</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-black text-[15px] font-semibold truncate">{lead.client?.name ?? '—'}</span>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>
                      {t(`requests.status.${st.key}`)}
                    </span>
                    {lead.identity_verified && <span title="verified">✅</span>}
                  </div>
                  <div className="text-[#8A8A8A] text-[13px] mt-0.5 truncate">📍 {lead.city || '—'} · {interest}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lead.status === 'new' ? (
                  <button
                    onClick={() => accept(lead)}
                    disabled={busy === lead.id}
                    className="flex-1 py-2.5 rounded-full bg-[#E2319B] text-white text-sm font-semibold active:opacity-80 disabled:opacity-50"
                  >
                    {busy === lead.id ? '…' : t('manager.accept')}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => openChat(lead)}
                      className="flex-1 py-2.5 rounded-full bg-[#1B1B1B] text-white text-sm font-semibold active:opacity-80"
                    >
                      {t('manager.openChat')}
                    </button>
                    <select
                      value={MANAGER_STATUSES.includes(lead.status) ? lead.status : 'in_progress'}
                      onChange={(e) => changeStatus(lead, e.target.value)}
                      className="py-2.5 px-3 rounded-full bg-[#F5F5F7] text-[13px] font-medium text-black outline-none"
                    >
                      {MANAGER_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`requests.status.${STATUS[s].key}`)}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
