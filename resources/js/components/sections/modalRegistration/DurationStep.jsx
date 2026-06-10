import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import useBookingStore from '@/stores/useBookingStore'
export default function DurationStep() {
  const { t } = useTranslation()
  const store = useBookingStore()
  const priceRowRef = useRef(null)
  const prevDuration = useRef(store.selectedDuration)
  useEffect(() => {
    const el = priceRowRef.current
    if (!el) return
    const wasSelected = !!prevDuration.current
    const isSelected = !!store.selectedDuration
    prevDuration.current = store.selectedDuration
    if (isSelected === wasSelected) return
    gsap.killTweensOf(el)
    if (isSelected) {
      gsap.set(el, { height: 'auto', overflow: 'hidden', opacity: 1 })
      const naturalHeight = el.offsetHeight
      gsap.fromTo(
        el,
        { height: 0, opacity: 0 },
        {
          height: naturalHeight,
          opacity: 1,
          duration: 0.32,
          ease: 'power3.out',
          onComplete: () => gsap.set(el, { height: 'auto', overflow: 'visible' }),
        },
      )
    } else {
      gsap.to(el, {
        height: 0,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => gsap.set(el, { overflow: 'hidden' }),
      })
    }
  }, [store.selectedDuration])
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl/[100%] font-semibold text-[#111]">{t('booking.durationTitle')}</h2>
        <p className="text-sm/[1.12] font-medium text-[#8A8A8F]">{t('booking.durationSub')}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5 ">
          {store.durations.map((d) => (
            <button
              key={d.id}
              onClick={() => store.setState({ selectedDuration: d })}
              className={[
                'p-4 rounded-full w-full text-nowrap text-base/[70%] font-medium transition-all duration-200 active:scale-95',
                store.selectedDuration?.id === d.id
                  ? 'bg-[#E2319B] text-white shadow-lg shadow-pink-200'
                  : 'bg-[#F4F4F4] text-[#111]',
              ].join(' ')}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div
          ref={priceRowRef}
          className="flex items-center justify-between"
          style={{ height: 0, overflow: 'hidden', opacity: 0 }}
        >
          <span className="text-sm font-medium text-[#9B9B9B]">{t('booking.youPay')}</span>
          <span className="text-base font-semibold text-[#111]">
            {store.selectedDuration
              ? `${store.selectedDuration.price.toLocaleString('ru-RU')} ฿`
              : ''}
          </span>
        </div>
      </div>
    </div>
  )
}