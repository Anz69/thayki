import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import StepProgress from '../StepProgress'
import { useCompactMode } from '@/composables/useCompactMode'

const MIN_AGE = 18
const MAX_AGE = 65
const AGES    = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i)

function clamp(v, min, max) { return Math.min(Math.max(v, min), max) }

function AgePicker({ value, onChange, itemH, visibleCount }) {
  const containerRef = useRef(null)
  const syncing      = useRef(false)
  const snapTimer    = useRef(null)
  const dragStartY   = useRef(0)
  const dragStartSc  = useRef(0)
  const itemHRef     = useRef(itemH)

  useEffect(() => { itemHRef.current = itemH }, [itemH])

  function getIdx(scrollTop) {
    return clamp(Math.round(scrollTop / itemHRef.current), 0, AGES.length - 1)
  }

  function scheduleSnap() {
    clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const ih  = itemHRef.current
      const idx = getIdx(el.scrollTop)
      syncing.current = true
      el.scrollTo({ top: idx * ih, behavior: 'smooth' })
      onChange(AGES[idx])
      setTimeout(() => { syncing.current = false }, 220)
    }, 100)
  }

  const onScroll = useCallback(() => {
    if (syncing.current) return
    const el = containerRef.current
    if (!el) return
    onChange(AGES[getIdx(el.scrollTop)])
    scheduleSnap()
  }, [onChange])

  function startDrag(e) {
    dragStartY.current  = e.clientY
    dragStartSc.current = containerRef.current?.scrollTop ?? 0
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', stopDrag)
  }
  function onDragMove(e) {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = dragStartSc.current - (e.clientY - dragStartY.current)
  }
  function stopDrag() {
    scheduleSnap()
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', stopDrag)
  }

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    syncing.current = true
    el.scrollTop = (value - MIN_AGE) * itemHRef.current
    setTimeout(() => { syncing.current = false }, 0)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    syncing.current = true
    el.scrollTop = (value - MIN_AGE) * itemH
    setTimeout(() => { syncing.current = false }, 0)
  }, [itemH])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      if (syncing.current) return
      const ih        = itemHRef.current
      const direction = e.deltaY > 0 ? 1 : -1
      const cur       = getIdx(el.scrollTop)
      const next      = clamp(cur + direction, 0, AGES.length - 1)
      syncing.current = true
      el.scrollTo({ top: next * ih, behavior: 'smooth' })
      onChange(AGES[next])
      setTimeout(() => { syncing.current = false }, 220)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      clearTimeout(snapTimer.current)
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', stopDrag)
    }
  }, [onChange])

  const padCount  = Math.floor(visibleCount / 2)  // items above/below center
  const totalH    = itemH * visibleCount
  const fadeH     = itemH * Math.min(2, padCount)

  return (
    <div className="relative w-full" style={{ height: totalH }}>
      <style>{`.age-picker::-webkit-scrollbar{display:none}`}</style>

      {/* top fade */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: fadeH, background: 'linear-gradient(to bottom, #fff 30%, transparent)' }}
      />
      {/* bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: fadeH, background: 'linear-gradient(to top, #fff 30%, transparent)' }}
      />

      <div
        ref={containerRef}
        className="age-picker h-full overflow-y-scroll"
        style={{ scrollSnapType: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'ns-resize' }}
        onScroll={onScroll}
        onMouseDown={(e) => { if (e.button === 0) { e.preventDefault(); startDrag(e) } }}
      >
        <div style={{ height: itemH * padCount }} />
        {AGES.map((age) => {
          const dist       = Math.abs(age - value)
          const isSelected = dist === 0
          return (
            <div
              key={age}
              style={{
                height:         itemH,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       isSelected ? Math.round(itemH * 0.57) : dist === 1 ? Math.round(itemH * 0.37) : Math.round(itemH * 0.31),
                fontWeight:     isSelected ? 700 : 400,
                color:          isSelected
                  ? '#1C1C1E'
                  : dist === 1
                  ? 'rgba(0,0,0,0.32)'
                  : dist === 2
                  ? 'rgba(0,0,0,0.20)'
                  : 'rgba(0,0,0,0.10)',
                transition: 'font-size 0.12s ease, color 0.12s ease',
                userSelect: 'none',
              }}
            >
              {age}
            </div>
          )
        })}
        <div style={{ height: itemH * padCount }} />
      </div>
    </div>
  )
}

export default function Step2Age({ isActive, stepNum, totalSteps, onNext }) {
  const [age, setAge] = useState(21)
  const isCompact = useCompactMode()

  const itemH        = isCompact ? 65 : 70
  const visibleCount = isCompact ? 7  : 7

  const headRef   = useRef(null)
  const pickerRef = useRef(null)
  const btnRef    = useRef(null)

  useLayoutEffect(() => {
    gsap.set([headRef.current, pickerRef.current, btnRef.current], { autoAlpha: 0, y: 20 })
  }, [])

  useEffect(() => {
    if (!isActive) return
    gsap.fromTo(
      [headRef.current, pickerRef.current, btnRef.current],
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
        className="flex-1 flex flex-col px-5 min-h-0 overflow-y-auto"
        style={{
          paddingTop: isCompact ? 16 : 32,
          paddingBottom: 'calc(1rem + var(--keyboard-offset, 0px))',
        }}
      >
        <div ref={headRef} className="flex flex-col shrink-0" style={{ gap: isCompact ? 6 : 10 }}>
          <h2
            className="font-[500] text-black tracking-[-0.025em] max-w-[290px]"
            style={{ fontSize: isCompact ? 20 : 24, lineHeight: '105%' }}
          >
            Укажите ваш Возраст
          </h2>
          <p
            className="text-[#7F7F7F] font-medium max-w-[280px]"
            style={{ fontSize: isCompact ? 13 : 14, lineHeight: '148%' }}
          >
            Чтобы клиенты смогли лучше узнать вас. Ваше имя будет отображаться всем
          </p>
        </div>

        {/* Picker занимает оставшееся пространство, но не overflow */}
        <div ref={pickerRef} className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          <AgePicker
            value={age}
            onChange={setAge}
            itemH={itemH}
            visibleCount={visibleCount}
          />
        </div>
      </div>

      <div
        ref={btnRef}
        className="shrink-0 px-5 flex flex-col justify-center"
        style={{ paddingTop: isCompact ? 12 : 16, paddingBottom: isCompact ? 24 : 32 }}
      >
        <button
          onClick={() => onNext({ age })}
          className="w-full rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity max-w-[190px] mx-auto"
          style={{ paddingTop: isCompact ? 14 : 18, paddingBottom: isCompact ? 14 : 18 }}
        >
          Далее
        </button>
      </div>
    </div>
  )
}
