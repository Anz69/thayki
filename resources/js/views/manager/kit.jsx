import { useTranslation } from 'react-i18next'

export const STATUS = {
  new:              { key: 'new',             bg: '#FDE8F5', fg: '#E2319B', dot: '#E2319B' },
  in_progress:      { key: 'inProgress',      bg: '#FFF1DC', fg: '#C77A12', dot: '#E0921C' },
  awaiting_client:  { key: 'awaitingClient',  bg: '#E9F0FF', fg: '#2F6BD8', dot: '#2F6BD8' },
  awaiting_payment: { key: 'awaitingPayment', bg: '#FFF1DC', fg: '#C77A12', dot: '#E0921C' },
  prepaid:          { key: 'prepaid',         bg: '#E6F5EA', fg: '#1E9E4E', dot: '#1E9E4E' },
  completed:        { key: 'completed',       bg: '#E6F5EA', fg: '#1E9E4E', dot: '#1E9E4E' },
  closed:           { key: 'closed',          bg: '#EFEFF2', fg: '#7A7A80', dot: '#A9A7AE' },
}

export function StatusChip({ status }) {
  const { t } = useTranslation()
  const s = STATUS[status] ?? STATUS.new
  return (
    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>
      {t(`requests.status.${s.key}`)}
    </span>
  )
}

export function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">{children}</p>
  )
}

export const Chevron = ({ className = 'w-4 h-4 text-[#C4C4C4]' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const VerifiedMark = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1E9E4E" className="shrink-0">
    <path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z" />
  </svg>
)
