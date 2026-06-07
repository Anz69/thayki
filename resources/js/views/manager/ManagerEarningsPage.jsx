import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import GradientBorder from '@/components/ui/GradientBorder'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const fmt = (minor) => '$ ' + Math.round((minor || 0) / 100).toLocaleString()

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl bg-[#1B1B1B] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="text-white/60 text-[10px] font-medium">{p.full}</div>
      <div className="text-white text-[13px] font-bold">{fmt(p.minor)}</div>
    </div>
  )
}

export default function ManagerEarningsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()
  const [data, setData] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    api.get('/manager/earnings')
      .then((r) => setData(r?.data?.data ?? null))
      .catch((e) => { logError(e); setData({ today: 0, week: 0, month: 0, total: 0, count: 0, series: [] }) })
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(els, { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' })
  })

  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const chart = useMemo(() => (data?.series ?? []).map((d) => {
    const dt = new Date(d.date + 'T00:00:00')
    return {
      minor: d.amount,
      value: Math.round((d.amount || 0) / 100),
      label: dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', ''),
      full: dt.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
    }
  }), [data, locale])

  const hasPayments = chart.some((c) => c.value > 0)
  const small = [['today', 'manager.earn.today'], ['week', 'manager.earn.week'], ['month', 'manager.earn.month']]

  return (
    <section ref={rootRef} className="flex flex-col min-h-screen bg-white">
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
        <div data-anim>
          <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-5 flex flex-col gap-1.5">
            <span className="text-[#ABABAB] text-[12px]/[100%] font-medium">{t('manager.earn.total')}</span>
            <span className="text-[#E2319B] text-[32px] leading-tight font-bold">{data === null ? '…' : fmt(data.total)}</span>
            {data !== null && (
              <span className="text-[#8A8A8A] text-[12px]/[120%]">{t('manager.earn.count', { n: data.count ?? 0 })}</span>
            )}
          </GradientBorder>
        </div>

        <div data-anim className="grid grid-cols-3 gap-2.5">
          {small.map(([key, label]) => (
            <div key={key} className="bg-[#EFEEF3] rounded-2xl px-3 py-3.5 flex flex-col gap-1.5">
              <span className="text-[#9B9AA0] text-[11px]/[100%] font-medium">{t(label)}</span>
              <span className="text-black text-[17px] leading-tight font-bold">{data === null ? '…' : fmt(data[key])}</span>
            </div>
          ))}
        </div>

        {/* Daily dynamics chart */}
        <div data-anim className="flex flex-col gap-2.5 mt-1">
          <span className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">
            {t('manager.earn.dynamics')}
          </span>
          <div className="bg-[#F7F6F9] rounded-2xl pt-4 pb-2 pr-2 relative">
            {data === null ? (
              <div className="h-[160px] flex items-center justify-center text-[#C4C4C4] text-[13px]">…</div>
            ) : !hasPayments ? (
              <div className="h-[160px] flex items-center justify-center text-[#B5B5BC] text-[13px] font-medium">
                {t('manager.earn.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chart} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E2319B" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#E2319B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tickMargin={8}
                    tick={{ fontSize: 10, fill: '#B5B5BC', fontWeight: 500 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E2319B', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#E2319B"
                    strokeWidth={2.4}
                    fill="url(#earnFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#E2319B', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive
                    animationDuration={650}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
