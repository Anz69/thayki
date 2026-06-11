import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'

export default function CancelLeadModal({ isOpen, onClose, onConfirm, busy }) {
  const { t } = useTranslation()
  return (
    <ModalMiddle isOpen={isOpen} onClose={busy ? undefined : onClose}>
      <div className="flex flex-col gap-5 p-6 pt-2">
        <div className="flex flex-col items-center gap-3 text-center pt-1">
          <h2 className="text-black text-2xl/[100%] font-semibold">{t('cancelLead.title')}</h2>
          <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
            {t('cancelLead.confirm')}
          </p>
        </div>
        <button
          onClick={() => onConfirm?.()}
          disabled={busy}
          className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
        >
          {busy ? '…' : t('common.yes')}
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="w-full py-4 rounded-full bg-[#333] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
        >
          {t('common.no')}
        </button>
      </div>
    </ModalMiddle>
  )
}
