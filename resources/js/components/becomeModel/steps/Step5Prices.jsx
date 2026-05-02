import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import gsap from 'gsap'
import StepProgress from '../StepProgress'
const PERIODS = [
  { key: 'hour', label: 'за час' },
  { key: 'threeHours', label: 'за 3 часа' },
  { key: 'day', label: 'за Сутки' },
  { key: 'night', label: 'за Ночь' },
]
function PriceRow({ value, onChange, period }) {
  const hasValue = value.trim().length > 0
  return (
    <div className="bg-[#F5F5F5] rounded-[14px] px-4 py-[14px] flex items-center ">
      <span
        className="text-black text-[15px]/[100%] font-medium shrink-0 inline-block overflow-hidden whitespace-nowrap "
        style={{
          maxWidth: hasValue ? '1.2em' : '0',
          marginRight: hasValue ? '0.2em' : '0',
          opacity: hasValue ? 1 : 0,
          transition: 'max-width 0.18s ease, opacity 0.18s ease',
        }}
      >
        ฿
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
        placeholder="Укажите цену"
        className="flex-1 bg-transparent text-black text-[15px]/[100%] font-medium outline-none placeholder:text-[#C0C0C0] min-w-0"
      />
      <span className="text-[#777779] flex items-center gap-1 text-[14px]/[100%] font-medium shrink-0 whitespace-nowrap">
        <span className='text-black'>/
        </span> {period}
      </span>
    </div>
  )
}
export default function Step5Prices({ isActive, stepNum, totalSteps, onNext, submitting = false, submitError = null }) {
  const [prices, setPrices] = useState({ hour: '', threeHours: '', day: '', night: '' })
  const hasAnyPrice = Object.values(prices).some((v) => v.trim().length > 0)
  const headRef = useRef(null)
  const bodyRef = useRef(null)
  const btnRef = useRef(null)
  const setPrice = (key) => (val) => setPrices((prev) => ({ ...prev, [key]: val }))
  useLayoutEffect(() => {
    gsap.set([headRef.current, bodyRef.current, btnRef.current], { autoAlpha: 0, y: 20 })
  }, [])
  useEffect(() => {
    if (!isActive) return
    gsap.fromTo(
      [headRef.current, bodyRef.current, btnRef.current],
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.46,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.08,
        clearProps: 'transform,opacity,visibility',
      },
    )
  }, [isActive])
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-8 shrink-0">
        <StepProgress current={stepNum} total={totalSteps} />
      </div>
      <div
        className="flex-1 flex flex-col gap-8 px-5 pt-8 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + var(--keyboard-offset, 0px))' }}
      >
        <div ref={headRef} className="flex flex-col gap-2.5 shrink-0">
          <h2 className="text-[24px]/[105%] font-[500] text-black tracking-[-0.025em] max-w-[290px]">
            Укажите цены за ваши услуги
          </h2>
          <p className="text-[#7F7F7F] text-[14px]/[148%] font-medium max-w-[300px]">
            Не переживайте, вы всегда можете изменить их.
          </p>
        </div>
        <div ref={bodyRef} className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col gap-3">
            {PERIODS.map(({ key, label }) => (
              <PriceRow key={key} value={prices[key]} onChange={setPrice(key)} period={label} />
            ))}
          </div>
          <p className="text-[#A0A0A0] text-[12px]/[148%] font-medium">
            *Не указывайте цену если не хотите, чтобы она отображалась
          </p>
        </div>
      </div>
      <div ref={btnRef} className="shrink-0 px-5 pt-4 pb-8 flex flex-col gap-3 justify-center">
        {submitError && (
          <p className="text-[#E2319B] text-sm/[140%] font-medium text-center">{submitError}</p>
        )}
        <button
          onClick={() => hasAnyPrice && !submitting && onNext({ prices })}
          disabled={submitting}
          style={{ background: (hasAnyPrice && !submitting) ? '#E2319B' : '#D0D0D0' }}
          className="w-full py-[18px] rounded-full text-white text-base/[100%] font-medium transition-colors duration-200 max-w-[191px] mx-auto"
        >
          {submitting ? 'Отправляем...' : 'Готово'}
        </button>
      </div>
    </div>
  )
}
