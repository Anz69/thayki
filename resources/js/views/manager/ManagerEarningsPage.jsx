import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
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

  const cards = [
    { key: 'today', accent: true },
    { key: 'week' },
    { key: 'month' },
    { key: 'total' },
  ]

  return (
    <main className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-50">
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

      <div className="container grid grid-cols-2 gap-3 pt-3 pb-24">
        {cards.map(({ key, accent }) => (
          <div
            key={key}
            className={[
              'rounded-2xl p-4 flex flex-col gap-1.5',
              accent ? 'bg-[#E2319B] text-white' : 'bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
            ].join(' ')}
          >
            <span className={`text-[12px]/[100%] font-medium ${accent ? 'text-white/80' : 'text-[#9B9AA0]'}`}>
              {t(`manager.earn.${key}`)}
            </span>
            <span className="text-[22px]/[110%] font-bold">
              {data === null ? '…' : fmt(data[key])}
            </span>
          </div>
        ))}
        {data !== null && (
          <div className="col-span-2 text-center text-[#8A8A8A] text-[13px] mt-1">
            {t('manager.earn.count', { n: data.count ?? 0 })}
          </div>
        )}
      </div>
    </main>
  )
}
