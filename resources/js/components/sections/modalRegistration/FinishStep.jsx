import useBookingStore from '@/stores/useBookingStore'

export default function FinishStep() {
  const store = useBookingStore()

  const formattedDate = (() => {
    if (!store.selectedDate) return '—'
    const { weekday, day } = store.selectedDate
    return `${weekday}, ${day}`
  })()

  const h = String(store.selectedHour).padStart(2, '0')
  const m = String(store.selectedMinute).padStart(2, '0')
  const formattedTime = `${h}:${m}`

  return (
    <div className="flex flex-col gap-5">
      <style>{`
        .summary-row { display: flex; align-items: center; justify-content: space-between; border-radius: 16px; }
        .summary-label { font-size: 13px; line-height: 100%; font-weight: 400; color: #9b9b9b; }
        .summary-value { font-size: 16px; line-height: 100%; font-weight: 400; color: #111; }
      `}</style>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl/[100%] font-semibold text-[#111]">Проверьте данные о встрече</h1>
        <p className="text-sm/[100%] text-[#7F7F7F]">Почти готово! Проверьте всё</p>
      </div>
      <div className="flex flex-col gap-6">
        {store.modelName && (
          <div className="summary-row">
            <span className="summary-label">Модель</span>
            <span className="summary-value">{store.modelName}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">Дата встречи</span>
          <span className="summary-value">{formattedDate}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Время встречи</span>
          <span className="summary-value">{formattedTime}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Длительность</span>
          <span className="summary-value">{store.selectedDuration?.label ?? '—'}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Вы заплатите</span>
          <span className="text-base font-medium text-[#111]">
            {store.selectedDuration
              ? `${store.selectedDuration.price.toLocaleString('ru-RU')} ฿`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
