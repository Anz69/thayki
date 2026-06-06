import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import GradientBorder from '@/components/ui/GradientBorder'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const fmt = (minor) => '฿ ' + Math.round((minor || 0) / 100).toLocaleString()

export default function ManagerEarningsPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/manager/earnings')
      .then((r) => setData(r?.data?.data ?? null))
      .catch((e) => { logError(e); setData({ today: 0, week: 0, month: 0, total: 0, count: 0 }) })
  }, [])

  const small = [
    { key: 'week' },
    { key: 'month' },
  ]

  return (
    <section className="flex flex-col min-h-screen bg-white">
      <header className="w-full py-4 bg-white/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/home')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('manager.earnings')}
          </span>
        </div>
      </header>

      <div className="container flex flex-col gap-3 pt-2 pb-24">
        {/* Total — accent */}
        <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-5 flex flex-col gap-1.5">
          <span className="text-[#ABABAB] text-[12px]/[100%] font-medium">{t('manager.earn.total')}</span>
          <span className="text-[#E2319B] text-[32px]/[100%] font-bold">
            {data === null ? '…' : fmt(data.total)}
          </span>
          {data !== null && (
            <span className="text-[#8A8A8A] text-[12px]/[120%]">{t('manager.earn.count', { n: data.count ?? 0 })}</span>
          )}
        </GradientBorder>

        {/* Today */}
        <div className="bg-[#EFEEF3] rounded-2xl px-4 py-4 flex items-center justify-between">
          <span className="text-black text-[15px]/[100%] font-medium">{t('manager.earn.today')}</span>
          <span className="text-black text-[18px]/[100%] font-bold">{data === null ? '…' : fmt(data.today)}</span>
        </div>

        {/* Week / month */}
        <div className="grid grid-cols-2 gap-3">
          {small.map(({ key }) => (
            <div key={key} className="bg-[#EFEEF3] rounded-2xl px-4 py-4 flex flex-col gap-1.5">
              <span className="text-[#9B9AA0] text-[12px]/[100%] font-medium">{t(`manager.earn.${key}`)}</span>
              <span className="text-black text-[20px]/[100%] font-bold">{data === null ? '…' : fmt(data[key])}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
