import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import gsap from 'gsap'
import GradientBorder from '@/components/ui/GradientBorder'
import StepProgress from '../StepProgress'
export default function Step1Name({ isActive, stepNum, totalSteps, onNext }) {
  const [name, setName] = useState('')
  const headRef  = useRef(null)
  const inputRef = useRef(null)
  const btnRef   = useRef(null)
  useLayoutEffect(() => {
    gsap.set([headRef.current, inputRef.current, btnRef.current], { autoAlpha: 0, y: 20 })
  }, [])
  useEffect(() => {
    if (!isActive) return
    gsap.fromTo(
      [headRef.current, inputRef.current, btnRef.current],
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
        className="flex-1 flex flex-col min-h-0 overflow-y-auto px-5 pt-8"
        style={{ paddingBottom: 'calc(1.5rem + var(--keyboard-offset, 0px))' }}
      >
        <div ref={headRef} className="flex flex-col gap-2.5 shrink-0">
          <h2 className="text-[24px]/[105%] font-[500] text-black tracking-[-0.025em] max-w-[290px]">
            Укажите ваше Имя
          </h2>
          <p className="text-[#7F7F7F] text-[14px]/[148%] font-medium max-w-[280px]">
            Чтобы клиенты смогли лучше узнать вас. Ваше имя будет отображаться всем
          </p>
        </div>
        <div ref={inputRef} className="flex-1 flex items-center min-h-[120px]">
          <GradientBorder className="w-full" radius={18} borderWidth={2.5}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
              placeholder="..."
              className="w-full px-5 py-5 text-black text-2xl/[100%] font-medium outline-none placeholder:text-[#C0C0C0] text-center bg-transparent"
            />
          </GradientBorder>
        </div>
      </div>
      <div ref={btnRef} className="shrink-0 px-5 pt-4 flex flex-col justify-center"
        style={{ paddingBottom: 'calc(2rem + var(--keyboard-offset, 0px))' }}>
        <button
          onClick={() => name.trim() && onNext({ name: name.trim() })}
          style={{ background: name.trim() ? '#1C1C1E' : '#D0D0D0' }}
          className="w-full py-[18px] rounded-full text-white text-base/[100%] font-medium transition-colors duration-200 max-w-[191px] mx-auto"
        >
          Далее
        </button>
      </div>
    </div>
  )
}