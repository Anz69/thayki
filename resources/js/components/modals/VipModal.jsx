import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'

const Feature = ({ icon, text }) => (
  <div className="flex items-center gap-3">
    <span className="shrink-0 size-9 rounded-full bg-[#FDE8F5] flex items-center justify-center text-[15px]">{icon}</span>
    <p className="text-[#3A3A3E] text-[14px]/[135%] font-medium">{text}</p>
  </div>
)

/**
 * V.I.P explainer. Purely informational — "Continue" hands control back to the
 * page, which switches the request form into V.I.P mode.
 */
export default function VipModal({ isOpen, onClose, onContinue }) {
  const { t } = useTranslation()

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-1 pb-6 flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-2.5">
          <div
            className="size-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#161616', boxShadow: '0 10px 26px rgba(0,0,0,0.22)' }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="#fff" strokeWidth="1" strokeLinejoin="round" opacity="0.55" />
            </svg>
          </div>
          <h2 className="text-black text-xl/[110%] font-bold">{t('vip.title')}</h2>
          <p className="text-[#7F7F7F] text-sm/[140%] font-medium max-w-[300px]">{t('vip.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-3.5 bg-[#F5F5F7] rounded-2xl p-4">
          <Feature icon="🔒" text={t('vip.b1')} />
          <Feature icon="✨" text={t('vip.b2')} />
          <Feature icon="🤝" text={t('vip.b3')} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-3.5 rounded-full bg-[#F0F0F3] text-black text-[15px] font-semibold active:bg-[#E6E4EB] transition-colors"
          >
            {t('vip.back')}
          </button>
          <button
            onClick={onContinue}
            className="py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:opacity-85 transition-opacity"
          >
            {t('vip.continue')}
          </button>
        </div>
      </div>
    </ModalMiddle>
  )
}
