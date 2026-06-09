import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import ModalMiddle from '@/layout/ModalMiddle'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

// Goal label sent to the manager (always Russian — managers read in Russian).
const VIP_GOAL = 'V.I.P модели'

const Feature = ({ icon, text }) => (
  <div className="flex items-start gap-3">
    <span className="shrink-0 size-8 rounded-full bg-[#FBF1F7] flex items-center justify-center text-[15px]">{icon}</span>
    <p className="text-[#3A3A3E] text-[14px]/[140%] font-medium pt-1">{text}</p>
  </div>
)

export default function VipModal({ isOpen, onClose, city = '' }) {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)

  const order = async () => {
    if (busy) return
    setBusy(true)
    try {
      const cityVal = city.trim() || '—'
      const message = `🌟 ${t('vip.title')}\n${t('request.city')}: ${cityVal}`
      const { data } = await api.post('/leads', {
        model_profile_id: null,
        city: cityVal,
        goal: VIP_GOAL,
        locale: (i18n.language || 'ru').startsWith('en') ? 'en' : 'ru',
        message,
      }, { headers: { 'Idempotency-Key': `vip-${Date.now()}` } })
      const from = encodeURIComponent(location.pathname || '/home')
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}&from=${from}`, { replace: true })
    } catch (err) {
      logError(err)
      setBusy(false)
    }
  }

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-1 pb-6 flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-2.5">
          <div
            className="size-16 rounded-2xl flex items-center justify-center text-3xl shadow-[0_10px_28px_rgba(226,49,155,0.35)]"
            style={{ background: 'linear-gradient(135deg, #F7C948 0%, #E2319B 70%)' }}
          >
            💎
          </div>
          <h2 className="text-black text-xl/[110%] font-bold">{t('vip.title')}</h2>
          <p className="text-[#7F7F7F] text-sm/[140%] font-medium max-w-[300px]">{t('vip.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-3.5 bg-[#FAFAFB] rounded-2xl p-4">
          <Feature icon="🔒" text={t('vip.b1')} />
          <Feature icon="✨" text={t('vip.b2')} />
          <Feature icon="🤝" text={t('vip.b3')} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="py-3.5 rounded-full bg-[#F0F0F3] text-black text-[15px] font-semibold active:bg-[#E6E4EB] transition-colors disabled:opacity-50"
          >
            {t('vip.back')}
          </button>
          <button
            onClick={order}
            disabled={busy}
            className="py-3.5 rounded-full text-white text-[15px] font-semibold active:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F7C948 0%, #E2319B 70%)' }}
          >
            {busy ? '…' : t('vip.order')}
          </button>
        </div>
      </div>
    </ModalMiddle>
  )
}
