import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import gsap from 'gsap'
import StepProgress from '../StepProgress'
import CustomSelect from '@/components/ui/CustomSelect'
import { scrollInputWithNext } from '@/utils/isTouchUi'
const BUST_OPTIONS = ['Маленькая', 'Средняя', 'Большая', 'Очень большая']
const BUTT_OPTIONS = ['Маленькая', 'Средняя', 'Большая', 'Очень большая']
function FieldLabel({ children }) {
  return (
    <span className="text-[12px]/[100%] font-medium tracking-[0.07em] text-[#A0A0A0] uppercase">
      {children}
    </span>
  )
}
function TextInput({ value, onChange, placeholder, suffix }) {
  return (
    <div className="bg-[#F5F5F5] rounded-[14px] px-4 py-[14px] flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => scrollInputWithNext(e.target)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-black text-[15px]/[100%] font-medium outline-none placeholder:text-[#C0C0C0]"
      />
      {suffix && (
        <span className="text-[#A0A0A0] text-sm font-medium shrink-0">{suffix}</span>
      )}
    </div>
  )
}
function isValidHeight(v) {
  const n = parseInt(v)
  return v && !isNaN(n) && n >= 140 && n <= 210
}
function isValidWeight(v) {
  const n = parseInt(v)
  return v && !isNaN(n) && n >= 35 && n <= 130
}
export default function Step3Info({ isActive, stepNum, totalSteps, onNext }) {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bust,   setBust]   = useState(null)
  const [butt,   setButt]   = useState(null)
  const heightOk = isValidHeight(height)
  const weightOk = isValidWeight(weight)
  const canProceed = heightOk && weightOk && bust !== null && butt !== null
  const headRef        = useRef(null)
  const fieldsRef      = useRef(null)
  const btnRef         = useRef(null)
  const scrollRef      = useRef(null)
  const bustWrapRef    = useRef(null)
  const buttWrapRef    = useRef(null)

  function handleSelectOpen(wrapRef) {
    setTimeout(() => {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 320)
  }
  useLayoutEffect(() => {
    gsap.set([headRef.current, fieldsRef.current, btnRef.current], { autoAlpha: 0, y: 20 })
  }, [])
  useEffect(() => {
    if (!isActive) return
    gsap.fromTo(
      [headRef.current, fieldsRef.current, btnRef.current],
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
        ref={scrollRef}
        className="flex-1 flex flex-col min-h-0 overflow-y-auto px-5 pt-8 gap-8 pb-4"
        style={{
          scrollbarWidth: 'none',
          paddingBottom: 'calc(1.5rem + var(--keyboard-offset, 0px))',
        }}
      >
        <div ref={headRef} className="flex flex-col gap-2.5">
          <h2 className="text-[24px]/[105%] font-[500] text-black tracking-[-0.025em] max-w-[290px]">
            Укажите дополнительную информацию
          </h2>
          <p className="text-[#7F7F7F] text-[14px]/[148%] font-medium max-w-[280px]">
            Чтобы клиенты смогли лучше узнать вас. Ваше имя будет отображаться всем
          </p>
        </div>
        <div ref={fieldsRef} className="flex flex-col gap-5 shrink-0">
          <div className="flex gap-3 flex-col ">
            <div className="flex-1 flex flex-col gap-1.5">
              <FieldLabel>Рост</FieldLabel>
              <TextInput value={height} onChange={setHeight} placeholder="165" />
              {height && !heightOk && (
                <span className="text-[#E2319B] text-xs font-medium px-1">От 140 до 210 см</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <FieldLabel>Вес</FieldLabel>
              <TextInput value={weight} onChange={setWeight} placeholder="55"  />
              {weight && !weightOk && (
                <span className="text-[#E2319B] text-xs font-medium px-1">От 35 до 130 кг</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Размер груди</FieldLabel>
            <div ref={bustWrapRef} className="bg-[#F5F5F5] rounded-[14px] px-4 ">
              <CustomSelect value={bust} onChange={setBust} options={BUST_OPTIONS} onOpen={() => handleSelectOpen(bustWrapRef)} placeholder="Выберите" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Размер попы</FieldLabel>
            <div ref={buttWrapRef} className="bg-[#F5F5F5] rounded-[14px] px-4 ">
              <CustomSelect value={butt} onChange={setButt} options={BUTT_OPTIONS} onOpen={() => handleSelectOpen(buttWrapRef)} placeholder="Выберите" />
            </div>
          </div>
        </div>
      </div>
      <div
        ref={btnRef}
        className="shrink-0 px-5 pt-4 flex flex-col justify-center"
        style={{ paddingBottom: '2rem' }}
      >
        <button
          onClick={() => canProceed && onNext({ height, weight, bust, butt })}
          style={{ background: canProceed ? '#1C1C1E' : '#D0D0D0' }}
          className="w-full py-[18px] rounded-full text-white text-base/[100%] font-medium transition-colors duration-200 max-w-[191px] mx-auto"
        >
          Далее
        </button>
      </div>
    </div>
  )
}