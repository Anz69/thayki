import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'

export default function ClearClientNotificationsModal({ isOpen, count = 0, busy, onCancel, onConfirmed }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (!isOpen) setConfirming(false) }, [isOpen])

  return (
    <ModalMiddle isOpen={isOpen} onClose={busy ? undefined : onCancel}>
      <div className="flex flex-col gap-5 p-6 pt-2">
        <div className="flex flex-col items-center gap-3 text-center pt-1">
          <h2 className="text-black text-2xl/[100%] font-semibold">
            {confirming ? t('clearNotif.confirmTitle') : t('clearNotif.title')}
          </h2>
          <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
            {confirming
              ? t('clearNotif.confirmText', { count })
              : t('clearNotif.subtitle', { count })}
          </p>
        </div>

        {confirming ? (
          <>
            <button
              onClick={() => onConfirmed?.()}
              disabled={busy}
              className="w-full py-4 rounded-full bg-[#E5484D] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
            >
              {busy ? '…' : t('clearNotif.confirmBtn')}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="w-full py-4 rounded-full bg-[#333] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
            >
              {t('common.yes')}
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="w-full py-4 rounded-full bg-[#333] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
            >
              {t('common.no')}
            </button>
          </>
        )}
      </div>
    </ModalMiddle>
  )
}
