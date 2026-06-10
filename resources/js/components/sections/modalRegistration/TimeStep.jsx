import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useBookingStore from '@/stores/useBookingStore'
import { useCompactMode } from '@/composables/useCompactMode'

const SNAP_DELAY = 110
const SMOOTH_SYNC_MS = 220
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)

const SCHEDULE_KEY = {
  day: 'booking.shiftDay',
  night: 'booking.shiftNight',
  any: null,
}

function isHourAllowed(hour, schedule) {
  if (schedule === 'day') return hour >= 7 && hour < 20
  if (schedule === 'night') return hour >= 20 || hour < 7
  return true
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function TimeStep() {
  const { t } = useTranslation()
  const store = useBookingStore()
  const isCompact = useCompactMode()

  const ITEM_HEIGHT = isCompact ? 42 : 52
  const DRUM_H = isCompact ? 200 : 260
  const PAD_H = isCompact ? 84 : 104
  const FADE_H = isCompact ? 80 : 96
  const HALF_ITEM = Math.floor(ITEM_HEIGHT / 2)

  const hoursRef = useRef(null)
  const minutesRef = useRef(null)
  const hoursTimer = useRef(null)
  const minutesTimer = useRef(null)
  const syncingHours = useRef(false)
  const syncingMinutes = useRef(false)
  const dragType = useRef(null)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const dragMoved = useRef(false)
  const itemHeightRef = useRef(ITEM_HEIGHT)

  itemHeightRef.current = ITEM_HEIGHT

  const timeValid = store.isTimeValid()
  const scheduleHint = SCHEDULE_KEY[store.schedule] ? t(SCHEDULE_KEY[store.schedule]) : null

  const takenHourSet = useMemo(() => {
    const taken = new Set()
    const day = store.selectedDate?.date
    if (!day) return taken
    const durationHours = store.selectedDuration?.hours ?? 1
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    for (let h = 0; h < 24; h++) {
      const t = new Date(dayStart)
      t.setHours(h, store.selectedMinute || 0, 0, 0)
      if (store.isSlotConflicting(t.getTime(), durationHours)) {
        taken.add(h)
      }
    }
    return taken
  }, [
    store.selectedDate,
    store.selectedDuration,
    store.selectedMinute,
    store.bookedSlots,
  ])

  const conflictWithCurrentSelection = useMemo(() => {
    const day = store.selectedDate?.date
    if (!day) return false
    const dur = store.selectedDuration?.hours ?? 1
    const dt = new Date(day)
    dt.setHours(store.selectedHour, store.selectedMinute, 0, 0)
    return store.isSlotConflicting(dt.getTime(), dur)
  }, [
    store.selectedDate,
    store.selectedHour,
    store.selectedMinute,
    store.selectedDuration,
    store.bookedSlots,
  ])

  function getIndexFromScroll(scrollTop, listLength) {
    return clamp(Math.round(scrollTop / itemHeightRef.current), 0, listLength - 1)
  }

  function scrollColumnTo(element, index, behavior = 'smooth') {
    if (!element) return
    element.scrollTo({ top: index * itemHeightRef.current, behavior })
  }

  function releaseHoursSync(behavior) {
    window.setTimeout(() => { syncingHours.current = false }, behavior === 'smooth' ? SMOOTH_SYNC_MS : 0)
  }
  function releaseMinutesSync(behavior) {
    window.setTimeout(() => { syncingMinutes.current = false }, behavior === 'smooth' ? SMOOTH_SYNC_MS : 0)
  }

  function scheduleHoursSnap() {
    window.clearTimeout(hoursTimer.current)
    hoursTimer.current = window.setTimeout(() => {
      if (!hoursRef.current) return
      const idx = getIndexFromScroll(hoursRef.current.scrollTop, hours.length)
      store.setState({ selectedHour: idx })
      syncingHours.current = true
      scrollColumnTo(hoursRef.current, idx)
      releaseHoursSync('smooth')
    }, SNAP_DELAY)
  }

  function scheduleMinutesSnap() {
    window.clearTimeout(minutesTimer.current)
    minutesTimer.current = window.setTimeout(() => {
      if (!minutesRef.current) return
      const idx = getIndexFromScroll(minutesRef.current.scrollTop, minutes.length)
      store.setState({ selectedMinute: idx })
      syncingMinutes.current = true
      scrollColumnTo(minutesRef.current, idx)
      releaseMinutesSync('smooth')
    }, SNAP_DELAY)
  }

  function onHoursScroll() {
    if (!hoursRef.current || syncingHours.current) return
    store.setState({ selectedHour: getIndexFromScroll(hoursRef.current.scrollTop, hours.length) })
    scheduleHoursSnap()
  }

  function onMinutesScroll() {
    if (!minutesRef.current || syncingMinutes.current) return
    store.setState({ selectedMinute: getIndexFromScroll(minutesRef.current.scrollTop, minutes.length) })
    scheduleMinutesSnap()
  }

  function selectHour(hour) {
    if (dragMoved.current) return
    store.setState({ selectedHour: hour })
    syncingHours.current = true
    scrollColumnTo(hoursRef.current, hour)
    releaseHoursSync('smooth')
  }

  function selectMinute(minute) {
    if (dragMoved.current) return
    store.setState({ selectedMinute: minute })
    syncingMinutes.current = true
    scrollColumnTo(minutesRef.current, minute)
    releaseMinutesSync('smooth')
  }

  function getActiveElement(type) {
    return type === 'hours' ? hoursRef.current : minutesRef.current
  }

  function startDrag(type, event) {
    const element = getActiveElement(type)
    if (!element) return
    dragType.current = type
    dragStartY.current = event.clientY
    dragStartScrollTop.current = element.scrollTop
    dragMoved.current = false
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', stopDrag)
  }

  function onDragMove(event) {
    const element = getActiveElement(dragType.current)
    if (!element) return
    const deltaY = event.clientY - dragStartY.current
    if (Math.abs(deltaY) > 2) dragMoved.current = true
    element.scrollTop = dragStartScrollTop.current - deltaY
  }

  function stopDrag() {
    if (dragType.current === 'hours') scheduleHoursSnap()
    if (dragType.current === 'minutes') scheduleMinutesSnap()
    dragType.current = null
    window.setTimeout(() => { dragMoved.current = false }, 0)
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', stopDrag)
  }

  useEffect(() => {
    if (!hoursRef.current || syncingHours.current) return
    const current = getIndexFromScroll(hoursRef.current.scrollTop, hours.length)
    if (current !== store.selectedHour) {
      syncingHours.current = true
      scrollColumnTo(hoursRef.current, store.selectedHour)
      releaseHoursSync('smooth')
    }
  }, [store.selectedHour])

  useEffect(() => {
    if (!minutesRef.current || syncingMinutes.current) return
    const current = getIndexFromScroll(minutesRef.current.scrollTop, minutes.length)
    if (current !== store.selectedMinute) {
      syncingMinutes.current = true
      scrollColumnTo(minutesRef.current, store.selectedMinute)
      releaseMinutesSync('smooth')
    }
  }, [store.selectedMinute])

  useEffect(() => {
    if (store.step !== 2) return
    syncingHours.current = true
    syncingMinutes.current = true
    scrollColumnTo(hoursRef.current, store.selectedHour, 'auto')
    scrollColumnTo(minutesRef.current, store.selectedMinute, 'auto')
    releaseHoursSync('auto')
    releaseMinutesSync('auto')
  }, [store.step])

  useEffect(() => {
    syncingHours.current = true
    syncingMinutes.current = true
    scrollColumnTo(hoursRef.current, store.selectedHour, 'auto')
    scrollColumnTo(minutesRef.current, store.selectedMinute, 'auto')
    releaseHoursSync('auto')
    releaseMinutesSync('auto')
    return () => {
      window.clearTimeout(hoursTimer.current)
      window.clearTimeout(minutesTimer.current)
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', stopDrag)
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .drum-wrap { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; }
        .drum-shell { position: relative; z-index: 1; touch-action: pan-y; overscroll-behavior: contain; }
        .drum-col { height: ${DRUM_H}px; width: 88px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scroll-snap-type: y mandatory; cursor: ns-resize; }
        .drum-col::-webkit-scrollbar { display: none; }
        .drum-pad { height: ${PAD_H}px; min-height: ${PAD_H}px; }
        .drum-item { height: ${ITEM_HEIGHT}px; width: 100%; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; font-size: ${isCompact ? 26 : 30}px; font-weight: 700; color: #d4d4d4; cursor: ns-resize; user-select: none; scroll-snap-align: center; scroll-snap-stop: always; transition: color 0.16s ease, font-size 0.16s ease, transform 0.16s ease, text-decoration 0.16s ease; position: relative; }
        .drum-item--active { color: #111; font-size: ${isCompact ? 30 : 34}px; }
        .drum-item--disabled { color: #e8e8e8; }
        .drum-item--taken { color: #f0a8c8; text-decoration: line-through; text-decoration-color: rgba(226, 49, 155, 0.55); text-decoration-thickness: 1.5px; }
        .drum-item--active.drum-item--taken { color: #e2319b; text-decoration-color: rgba(226, 49, 155, 0.85); }
        .drum-colon { position: relative; z-index: 2; padding-bottom: 4px; font-size: ${isCompact ? 28 : 32}px; font-weight: 700; line-height: 1; color: #111; }
        .drum-highlight { position: absolute; top: calc(50% - ${HALF_ITEM}px); left: 50%; z-index: 0; height: ${ITEM_HEIGHT}px; width: 100%; transform: translateX(-50%); border-top: 1px solid rgba(0,0,0,0.1); border-bottom: 1px solid rgba(0,0,0,0.1); pointer-events: none; }
        .drum-fade-top { position: absolute; top: 0; left: 0; right: 0; z-index: 2; height: ${FADE_H}px; background: linear-gradient(to bottom, #fff 0%, transparent 100%); pointer-events: none; }
        .drum-fade-bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 2; height: ${FADE_H}px; background: linear-gradient(to top, #fff 0%, transparent 100%); pointer-events: none; }
        .drum-fade-right { position: absolute; top: 0; right: 0; bottom: 0; z-index: 2; width: 96px; background: linear-gradient(to left, #fff 0%, transparent 100%); pointer-events: none; }
        .drum-fade-left { position: absolute; top: 0; left: 0; bottom: 0; z-index: 2; width: 96px; background: linear-gradient(to right, #fff 0%, transparent 100%); pointer-events: none; }
      `}</style>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl/[100%] font-semibold text-[#111]">{t('booking.timeTitle')}</h2>
        <p className="text-sm/[100%] font-medium text-[#8A8A8F]">{t('booking.timeSub')}</p>
        {conflictWithCurrentSelection && (
          <p className="text-[#E2319B] text-sm/[140%] font-medium">
            {t('booking.timeTaken')}
          </p>
        )}
      </div>

      <div className="drum-wrap">
        <div className="drum-highlight" />
        <div className="drum-fade-top" />
        <div className="drum-fade-bottom" />
        <div className="drum-fade-right" />
        <div className="drum-fade-left" />
        <div
          className="drum-shell"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            ref={hoursRef}
            className="drum-col"
            onScroll={onHoursScroll}
            onMouseDown={(e) => { if (e.button === 0) { e.preventDefault(); startDrag('hours', e) } }}
          >
            <div className="drum-pad" aria-hidden="true" />
            {hours.map((hour) => {
              const allowed = isHourAllowed(hour, store.schedule)
              const taken = takenHourSet.has(hour)
              return (
                <button
                  key={hour}
                  type="button"
                  className={[
                    'drum-item',
                    hour === store.selectedHour ? ' drum-item--active' : '',
                    !allowed ? ' drum-item--disabled' : '',
                    allowed && taken ? ' drum-item--taken' : '',
                  ].join('')}
                  onClick={() => selectHour(hour)}
                  title={taken ? t('booking.hourTaken') : ''}
                >
                  {String(hour).padStart(2, '0')}
                </button>
              )
            })}
            <div className="drum-pad" aria-hidden="true" />
          </div>
        </div>

        <span className="drum-colon">:</span>

        <div
          className="drum-shell"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            ref={minutesRef}
            className="drum-col"
            onScroll={onMinutesScroll}
            onMouseDown={(e) => { if (e.button === 0) { e.preventDefault(); startDrag('minutes', e) } }}
          >
            <div className="drum-pad" aria-hidden="true" />
            {minutes.map((minute) => (
              <button
                key={minute}
                type="button"
                className={`drum-item${minute === store.selectedMinute ? ' drum-item--active' : ''}`}
                onClick={() => selectMinute(minute)}
              >
                {String(minute).padStart(2, '0')}
              </button>
            ))}
            <div className="drum-pad" aria-hidden="true" />
          </div>
        </div>
      </div>

    </div>
  )
}
