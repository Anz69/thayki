import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'

const Row = ({ icon, label, hint, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={[
      'w-full flex items-center gap-3 bg-[#EFEEF3] rounded-2xl px-4 py-4 text-left transition-colors',
      disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-[#E4E2E8]',
    ].join(' ')}
  >
    <span className="flex items-center justify-center size-9 rounded-xl bg-white shrink-0">{icon}</span>
    <span className="flex flex-col min-w-0">
      <span className="text-black text-[16px]/[120%] font-medium">{label}</span>
      {hint && <span className="text-[#8A8A8A] text-[12px]/[120%]">{hint}</span>}
    </span>
    <svg className="w-4 h-4 text-[#C4C4C4] ml-auto shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
)

export default function ManagerPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()

  return (
    <main className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-50">
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

      <div className="container flex flex-col gap-3 pt-3 pb-24">
        <Row
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          label={t('manager.leads')}
          onClick={() => navigate('/manager/leads')}
        />
        <Row
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          label={t('manager.support')}
          hint={t('manager.soon')}
          disabled
        />
        <Row
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12M19 15l2 2-2 2" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          label={t('manager.earnings')}
          onClick={() => navigate('/manager/earnings')}
        />
      </div>
    </main>
  )
}
