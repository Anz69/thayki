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
          <div className="size-14 rounded-2xl bg-[#FDE8F5] flex items-center justify-center text-3xl">💎</div>
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
