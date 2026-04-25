import { useMemo, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import useBookingStore from '@/stores/useBookingStore'
import { useCompactMode } from '@/composables/useCompactMode'

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function DateStep() {
  const store = useBookingStore()
  const isCompact = useCompactMode()
  const cardSize = isCompact ? 114 : 114
  const stepGap = isCompact ? 20 : 32

  const days = useMemo(() => {
    const result = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      result.push({
        key: d.toDateString(),
        weekday: WEEKDAYS[d.getDay()],
        day: d.getDate(),
        date: d,
      })
    }
    return result
  }, [])

  useEffect(() => {
    if (store.isOpen && !store.selectedDate && days.length) {
      store.setState({ selectedDate: days[0] })
    }
  }, [store.isOpen])

  return (
    <div className="date-step">
      <style>{`
        .date-step { display: flex; flex-direction: column; gap: ${stepGap}px; padding-bottom: 8px; }
        .date-swiper { overflow: visible; margin-inline: -20px; padding-inline: 20px; }
        .date-slide { width: ${cardSize}px; }
        .date-card {
          width: ${cardSize}px; height: ${cardSize}px; border-radius: 22px;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 4px;
          transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .date-card--default { background: #f1f1f7; border: 6px solid transparent; }
        .date-card--active { background: #fff; border: 6px solid #e2319b; }
        .date-card:active { transform: scale(0.985); }
      `}</style>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl/[100%] font-semibold text-[#111]">Выбор даты</h1>
        <p className="text-sm/[100%] font-medium text-[#8A8A8F]">В какой день планируете встречу?</p>
      </div>
      <Swiper slidesPerView="auto" spaceBetween={16} className="date-swiper">
        {days.map((day) => (
          <SwiperSlide key={day.key} className="date-slide">
            <button
              type="button"
              className={`date-card ${store.selectedDate?.key === day.key ? 'date-card--active' : 'date-card--default'}`}
              onClick={() => store.setState({ selectedDate: day })}
            >
              <span
                className={`text-[26px] font-normal tracking-[-0.03em]`}
                style={{ color: store.selectedDate?.key === day.key ? '#E2319B' : '#848484' }}
              >
                {day.weekday}
              </span>
              <span
                className={`text-[33px]/[0.92] font-normal tracking-[-0.05em]`}
                style={{ color: store.selectedDate?.key === day.key ? '#E2319B' : '#848484' }}
              >
                {day.day}
              </span>
            </button>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
