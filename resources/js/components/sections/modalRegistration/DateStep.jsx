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

  // Annotate each day with whether it has any conflicts so we can render
  // a small dot, and whether it's effectively "fully booked" so we can dim
  // it. `bookedSlots` changes when the store finishes loading availability;
  // re-running this memo on that change keeps the markers fresh.
  const annotated = useMemo(() => {
    return days.map((d) => {
      const dayStart = new Date(d.date)
      dayStart.setHours(0, 0, 0, 0)
      const startMs = dayStart.getTime()
      const endMs   = startMs + 24 * 3600 * 1000
      const hasAnyConflict = store.bookedSlots.some(
        (s) => s.startMs < endMs && startMs < s.endMs,
      )
      const fullyBooked = store.isDayFullyBooked(dayStart, store.schedule)
      return { ...d, hasAnyConflict, fullyBooked }
    })
  }, [days, store.bookedSlots, store.schedule])

  useEffect(() => {
    if (store.isOpen && !store.selectedDate && annotated.length) {
      // Pick the first day that isn't fully booked so the user lands on
      // a usable choice.
      const first = annotated.find((d) => !d.fullyBooked) ?? annotated[0]
      store.setState({ selectedDate: first })
    }
  }, [store.isOpen, annotated.length])

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
          position: relative;
          transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }
        .date-card--default { background: #f1f1f7; border: 6px solid transparent; }
        .date-card--active { background: #fff; border: 6px solid #e2319b; }
        .date-card--full { opacity: 0.45; }
        .date-card:active { transform: scale(0.985); }
        .date-card__busy-dot {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e2319b;
        }
        .date-card__full-pill {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          padding: 2px 8px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.06);
          font-size: 10px;
          font-weight: 600;
          color: #7f7f7f;
          line-height: 1;
        }
      `}</style>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl/[100%] font-semibold text-[#111]">Выбор даты</h1>
        <p className="text-sm/[100%] font-medium text-[#8A8A8F]">В какой день планируете встречу?</p>
      </div>
      <Swiper slidesPerView="auto" spaceBetween={16} className="date-swiper">
        {annotated.map((day) => {
          const isActive = store.selectedDate?.key === day.key
          const baseClass = isActive ? 'date-card--active' : 'date-card--default'
          const fullClass = day.fullyBooked && !isActive ? ' date-card--full' : ''
          return (
            <SwiperSlide key={day.key} className="date-slide">
              <button
                type="button"
                className={`date-card ${baseClass}${fullClass}`}
                onClick={() => store.setState({ selectedDate: day })}
                title={day.fullyBooked ? 'Этот день полностью занят' : (day.hasAnyConflict ? 'Есть занятые часы' : '')}
              >
                <span
                  className="text-[26px] font-normal tracking-[-0.03em]"
                  style={{ color: isActive ? '#E2319B' : '#848484' }}
                >
                  {day.weekday}
                </span>
                <span
                  className="text-[33px]/[0.92] font-normal tracking-[-0.05em]"
                  style={{ color: isActive ? '#E2319B' : '#848484' }}
                >
                  {day.day}
                </span>
                {day.hasAnyConflict && !day.fullyBooked && !isActive && (
                  <span className="date-card__busy-dot" aria-hidden="true" />
                )}
                {day.fullyBooked && (
                  <span className="date-card__full-pill">занято</span>
                )}
              </button>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
