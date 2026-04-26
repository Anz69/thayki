import { useState, useEffect } from 'react'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import useAuthStore from '@/stores/useAuthStore'

// ── Icons ──────────────────────────────────────────────────────────────────
const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M15.75 9V6.375C15.75 5.754 15.246 5.25 14.625 5.25H3.375C2.754 5.25 2.25 4.746 2.25 4.125V4.125C2.25 3.504 2.754 3 3.375 3H13.5M15.75 9V12.375C15.75 12.996 15.246 13.5 14.625 13.5H3.375C2.754 13.5 2.25 12.996 2.25 12.375V4.125M15.75 9H13.5C12.672 9 12 9.672 12 10.5C12 11.328 12.672 12 13.5 12H15.75" stroke="#E2319B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconMeetings = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M12.75 2.25V3.75M5.25 2.25V3.75M2.25 6.75H15.75M3 3H15C15.414 3 15.75 3.336 15.75 3.75V15C15.75 15.414 15.414 15.75 15 15.75H3C2.586 15.75 2.25 15.414 2.25 15V3.75C2.25 3.336 2.586 3 3 3Z" stroke="#7B5BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="10.5" r="1" fill="#7B5BFF"/>
    <circle cx="9" cy="10.5" r="1" fill="#7B5BFF"/>
    <circle cx="12" cy="10.5" r="1" fill="#7B5BFF"/>
  </svg>
)
const IconTrend = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M2.25 12.75L6.75 8.25L9.75 11.25L15 5.25M15 5.25H11.25M15 5.25V9" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconArrowUp = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 11.667V2.333M7 2.333L2.333 7M7 2.333L11.667 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconArrowDown = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2.333V11.667M7 11.667L11.667 7M7 11.667L2.333 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.167L8.795 4.805L12.833 5.397L9.917 8.238L10.59 12.26L7 10.371L3.41 12.26L4.083 8.238L1.167 5.397L5.205 4.805L7 1.167Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.167 12.25C1.167 12.25 1.75 8.75 7 8.75C12.25 8.75 12.833 12.25 12.833 12.25M9.917 4.083C9.917 5.601 8.518 6.833 7 6.833C5.482 6.833 4.083 5.601 4.083 4.083C4.083 2.565 5.482 1.167 7 1.167C8.518 1.167 9.917 2.565 9.917 4.083Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Helpers ─────────────────────────────────────────────────────────────────
const minor2thb = (minor) => Math.floor((minor ?? 0) / 100)
const formatThb = (thb) => thb.toLocaleString('ru-RU')

function formatTxDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return 'только что'
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}`
  } catch { return '' }
}

const TX_LABEL = {
  credit_payment: 'Оплата встречи',
  debit_withdraw: 'Вывод средств',
  adjustment:     'Корректировка',
}

// ── Sub-components ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="flex-1 bg-[#F5F5F7] rounded-2xl px-4 py-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: accent + '18' }}>
          {icon}
        </div>
        <span className="text-[#ABABAB] text-xs/[100%] font-medium">{label}</span>
      </div>
      <span className="text-black text-xl/[100%] font-bold">{value}</span>
      {sub && <span className="text-[#ABABAB] text-xs/[100%] font-medium">{sub}</span>}
    </div>
  )
}

function TxRow({ tx }) {
  const isCredit = tx.type === 'credit_payment' || (tx.type === 'adjustment' && (tx.amount_minor ?? 0) >= 0)
  const isDebit  = tx.type === 'debit_withdraw' || (tx.type === 'adjustment' && (tx.amount_minor ?? 0) < 0)
  const thb = minor2thb(Math.abs(tx.amount_minor ?? 0))
  const label = TX_LABEL[tx.type] ?? tx.type
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0] last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isCredit ? '#22C55E18' : '#EF444418' }}
        >
          <span style={{ color: isCredit ? '#22C55E' : '#EF4444' }}>
            {isCredit ? <IconArrowDown /> : <IconArrowUp />}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-black text-sm/[100%] font-medium">{label}</span>
          <span className="text-[#ABABAB] text-xs/[100%]">{formatTxDate(tx.created_at)}</span>
        </div>
      </div>
      <span
        className="text-sm/[100%] font-bold"
        style={{ color: isCredit ? '#22C55E' : '#EF4444' }}
      >
        {isCredit ? '+' : '−'}฿{formatThb(thb)}
      </span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function InfoModal({ isOpen, onClose }) {
  const { user } = useAuthStore()
  const [loading, setLoading]         = useState(false)
  const [wallet, setWallet]           = useState(null)
  const [activeMtg, setActiveMtg]     = useState(null)   // total from pagination
  const [completedMtg, setCompletedMtg] = useState(null)
  const [txns, setTxns]               = useState([])

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)

    Promise.allSettled([
      api.get('/wallet'),
      api.get('/meetings', { params: { per_page: 1, statuses: 'pending,accepted,paid,confirmed' } }),
      api.get('/meetings', { params: { per_page: 1, statuses: 'completed', role: 'model' } }),
      api.get('/wallet/transactions', { params: { per_page: 5 } }),
    ]).then(([walletRes, activeMtgRes, completedMtgRes, txnRes]) => {
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data?.data ?? null)
      if (activeMtgRes.status === 'fulfilled') setActiveMtg(activeMtgRes.value.data?.meta?.pagination?.total ?? 0)
      if (completedMtgRes.status === 'fulfilled') setCompletedMtg(completedMtgRes.value.data?.meta?.pagination?.total ?? 0)
      if (txnRes.status === 'fulfilled') {
        const raw = txnRes.value.data?.data ?? []
        setTxns(Array.isArray(raw) ? raw : [])
      }
    }).finally(() => setLoading(false))
  }, [isOpen])

  const available = minor2thb(wallet?.available_minor ?? 0)
  const total     = minor2thb(wallet?.balance_minor ?? 0)
  const locked    = minor2thb(wallet?.locked_minor ?? 0)
  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : (user?.username ? '@' + user.username : 'Модель')

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-5 px-5 pb-6 pt-1 overflow-y-auto max-h-[80dvh]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-black text-xl/[100%] font-bold">Статистика</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center active:bg-[#ECEAEC] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="#7F7F7F" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-[#E2319B] border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div
              className="rounded-3xl px-5 py-5 flex flex-col gap-1"
              style={{ background: 'linear-gradient(135deg, #E2319B 0%, #b91c7c 100%)' }}
            >
              <span className="text-white/70 text-xs/[100%] font-medium uppercase tracking-widest">
                Баланс
              </span>
              <div className="flex items-end gap-1.5">
                <span className="text-white text-3xl/[100%] font-bold">
                  ฿{formatThb(available)}
                </span>
                <span className="text-white/60 text-sm/[100%] font-medium pb-0.5">доступно</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span className="text-white/60 text-xs/[100%]">Всего ฿{formatThb(total)}</span>
                </div>
                {locked > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-300/70" />
                    <span className="text-white/60 text-xs/[100%]">Заблокировано ฿{formatThb(locked)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile row */}
            <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl px-4 py-3.5">
              <div className="w-10 h-10 rounded-full bg-[#E2319B] flex items-center justify-center shrink-0 overflow-hidden">
                {user?.photo_url
                  ? <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white text-base font-bold">{displayName[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-black text-sm/[100%] font-semibold">{displayName}</span>
                {user?.username && (
                  <span className="text-[#ABABAB] text-xs/[100%]">@{user.username}</span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[#7F7F7F] text-xs/[100%] font-medium">Активен</span>
              </div>
            </div>

            {/* Meeting stats */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#ABABAB] text-xs/[100%] font-semibold uppercase tracking-widest px-1">
                Встречи
              </span>
              <div className="flex gap-3">
                <StatCard
                  icon={<IconMeetings />}
                  label="Активных"
                  value={activeMtg ?? '—'}
                  sub="сейчас"
                  accent="#7B5BFF"
                />
                <StatCard
                  icon={<IconTrend />}
                  label="Завершено"
                  value={completedMtg ?? '—'}
                  sub="всего"
                  accent="#22C55E"
                />
              </div>
            </div>

            {/* Transactions */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#ABABAB] text-xs/[100%] font-semibold uppercase tracking-widest px-1">
                Последние операции
              </span>
              <div className="bg-[#F5F5F7] rounded-2xl px-4">
                {txns.length === 0 ? (
                  <p className="text-[#ABABAB] text-sm/[100%] font-medium py-4 text-center">
                    Операций пока нет
                  </p>
                ) : (
                  txns.map(tx => <TxRow key={tx.id} tx={tx} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalMiddle>
  )
}
