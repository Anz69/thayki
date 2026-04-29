import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 9l6 6 6-6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
export default function CustomSelect({ value, onChange, options = [], onOpen }) {
  const [open, setOpen]   = useState(false)
  const listRef           = useRef(null)
  const chevronRef        = useRef(null)
  const items = options.map((o) =>
    typeof o === 'object' ? o : { value: o, label: o }
  )
  const current = items.find((o) => o.value === value) ?? items[0]
  const getItems = () => listRef.current?.querySelectorAll('button') ?? []
  const toggle = useCallback(() => {
    const el = listRef.current
    if (!el) return
    if (open) {
      gsap.to(getItems(), {
        autoAlpha: 0,
        y: -5,
        duration: 0.14,
        stagger: { each: 0.04, from: 'end' },
        ease: 'power2.in',
      })
      gsap.fromTo(
        el,
        { height: el.offsetHeight },
        { height: 0, duration: 0.24, ease: 'power2.inOut', delay: 0.08 },
      )
      gsap.to(chevronRef.current, { rotation: 0, duration: 0.24, ease: 'back.out(1.4)' })
      setOpen(false)
    } else {
      gsap.set(el, { height: 'auto' })
      const h = el.scrollHeight
      gsap.fromTo(el, { height: 0 }, {
        height: h,
        duration: 0.30,
        ease: 'power3.out',
        onComplete: () => gsap.set(el, { height: 'auto' }),
      })
      gsap.fromTo(
        getItems(),
        { autoAlpha: 0, y: -8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.26,
          stagger: 0.055,
          ease: 'power3.out',
          delay: 0.10,
          clearProps: 'transform,opacity,visibility',
        },
      )
      gsap.to(chevronRef.current, { rotation: 180, duration: 0.24, ease: 'back.out(1.4)' })
      setOpen(true)
      onOpen?.()
    }
  }, [open, onOpen])
  const select = useCallback((val) => {
    onChange(val)
    const el = listRef.current
    if (!el) return
    gsap.to(getItems(), { autoAlpha: 0, duration: 0.10, ease: 'power2.in' })
    gsap.fromTo(
      el,
      { height: el.offsetHeight },
      { height: 0, duration: 0.22, ease: 'power2.inOut', delay: 0.06 },
    )
    gsap.to(chevronRef.current, { rotation: 0, duration: 0.22, ease: 'back.out(1.4)' })
    setOpen(false)
  }, [onChange])
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={toggle}
        className="w-full min-h-10 py-1 flex items-center justify-between active:opacity-70 transition-opacity"
      >
        <span className="text-black text-sm/[100%] font-medium">{current?.label}</span>
        <div ref={chevronRef} style={{ display: 'flex', transformOrigin: 'center' }}>
          <ChevronIcon />
        </div>
      </button>
      <div ref={listRef} style={{ height: 0, overflow: 'hidden' }}>
        <div className="flex flex-col pt-3 pb-1 gap-1">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => select(item.value)}
              className={[
                'w-full text-left px-2 py-2.5 rounded-xl text-sm/[100%] font-medium transition-colors',
                item.value === value
                  ? 'bg-[#E2319B]/10 text-[#E2319B]'
                  : 'text-[#333] hover:bg-[#ECEAEC] active:bg-[#ECEAEC] bg-black/[0.03]',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}