import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { getEmojiUrl } from '@/utils/emoji'
const SCHEDULES = [
  { id: 'day',   emoji: '☀️', label: 'Дневной', time: '7:00-20:00'      },
  { id: 'night', emoji: '🌙', label: 'Ночной',  time: '20:00-7:00'      },
  { id: 'any',   emoji: '🌕', label: 'Любой',   time: 'Круглосуточно'   },
]
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 9l6 6 6-6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
export default function ScheduleSelector({ value, onChange, isEditing = false }) {
  const [open, setOpen] = useState(false)
  const optionsRef  = useRef(null)
  const chevronRef  = useRef(null)
  const mountedRef  = useRef(false)
  const selected    = SCHEDULES.find((s) => s.id === value) ?? SCHEDULES[2]

  useLayoutEffect(() => {
    if (!chevronRef.current) return
    if (isEditing) {
      gsap.set(chevronRef.current, { autoAlpha: 1, width: 14, marginLeft: 6 })
    } else {
      gsap.set(chevronRef.current, { autoAlpha: 0, width: 0, marginLeft: 0, overflow: 'hidden' })
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (!chevronRef.current) return
    if (isEditing) {
      gsap.fromTo(chevronRef.current,
        { autoAlpha: 0, width: 0, marginLeft: 0 },
        { autoAlpha: 1, width: 14, marginLeft: 6, duration: 0.30, ease: 'power3.out', delay: 0.16 }
      )
    } else {
      if (open && optionsRef.current) {
        gsap.set(optionsRef.current, { height: 0 })
        setOpen(false)
      }
      gsap.to(chevronRef.current, { autoAlpha: 0, width: 0, marginLeft: 0, duration: 0.22, ease: 'power2.in' })
    }
  }, [isEditing])

  const toggle = useCallback(() => {
    if (!isEditing) return
    const el = optionsRef.current
    if (!el) return
    if (open) {
      gsap.fromTo(el,
        { height: el.offsetHeight },
        { height: 0, duration: 0.28, ease: 'power2.inOut' }
      )
      gsap.to(chevronRef.current, { rotation: 0, duration: 0.22, ease: 'power2.inOut' })
      setOpen(false)
    } else {
      gsap.set(el, { height: 'auto' })
      const h = el.scrollHeight
      gsap.fromTo(el,
        { height: 0 },
        { height: h, duration: 0.32, ease: 'power3.out', onComplete: () => gsap.set(el, { height: 'auto' }) }
      )
      gsap.to(chevronRef.current, { rotation: 180, duration: 0.22, ease: 'power2.inOut' })
      setOpen(true)
    }
  }, [open, isEditing])

  const select = useCallback((id) => {
    onChange(id)
    const el = optionsRef.current
    if (!el) return
    gsap.fromTo(el,
      { height: el.offsetHeight },
      { height: 0, duration: 0.24, ease: 'power2.inOut' }
    )
    gsap.to(chevronRef.current, { rotation: 0, duration: 0.2, ease: 'power2.inOut' })
    setOpen(false)
  }, [onChange])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <button
          onClick={toggle}
          className={`w-full bg-[#F5F5F7] rounded-2xl flex items-center justify-between p-5 transition-colors ${isEditing ? 'active:bg-[#ECEAEC]' : 'pointer-events-none'}`}
        >
          <span className="text-[#7F7F7F] text-base/[100%] font-medium">График</span>
          <div className="flex items-center">
            <span className="text-black text-base/[100%] font-medium">{selected.label}</span>
            <div ref={chevronRef} style={{ display: 'flex', overflow: 'hidden' }}>
              <ChevronDownIcon />
            </div>
          </div>
        </button>
        <div ref={optionsRef} style={{ height: 0, overflow: 'hidden' }}>
          <div className="flex flex-col gap-2 pb-3">
            {SCHEDULES.map((s) => (
              <button
                key={s.id}
                onClick={() => select(s.id)}
                className={[
                  'w-full flex items-center gap-2 rounded-full py-3 px-4 text-base/[100%] font-medium text-left transition-colors w-max',
                  s.id === value ? 'bg-[#E2319B] text-white' : 'bg-[#ECEAEC] text-black',
                ].join(' ')}
              >
                <img src={getEmojiUrl(s.emoji)} alt={s.emoji} width={16} height={16} draggable={false} />
                <span>{s.label}</span>
                <span className={s.id === value ? 'text-white/80' : 'text-[#7F7F7F]'}>{s.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {isEditing && (
        <p className="text-[#7F7F7F] text-xs/[140%] font-normal px-1">
          Укажите время в которое вы активны больше всего.
        </p>
      )}
    </div>
  )
}
