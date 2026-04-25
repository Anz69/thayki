import { useRef, useLayoutEffect, useEffect } from 'react'
import gsap from 'gsap'
import ModelCardCarousel from '@/components/ui/ModelCardCarousel'
import { usePageReady } from '@/composables/usePageReady'
export default function BecomeModelLanding({ isActive, onStart }) {
  const titleRef    = useRef(null)
  const subtitleRef = useRef(null)
  const btnRef      = useRef(null)
  // Флаг: лоадер завершился и можно проигрывать анимации
  const loaderDone  = useRef(false)

  useLayoutEffect(() => {
    gsap.set([titleRef.current, subtitleRef.current, btnRef.current], { autoAlpha: 0, y: 22 })
  }, [])

  const playAnimation = () => {
    gsap.to([titleRef.current, subtitleRef.current, btnRef.current], {
      autoAlpha: 1,
      y: 0,
      duration: 0.52,
      stagger: 0.09,
      ease: 'power3.out',
      delay: 0.15,
      clearProps: 'transform,opacity,visibility',
    })
  }

  // Ждём окончания лоадера — только тогда разрешаем анимацию
  usePageReady(() => {
    loaderDone.current = true
    if (isActive) playAnimation()
  })

  // При возврате на этот слайд (после шага 1 → назад)
  // лоадер уже завершён, запускаем сразу
  useEffect(() => {
    if (!isActive || !loaderDone.current) return
    playAnimation()
  }, [isActive])
  return (
    <div className="flex flex-col h-full justify-between">


      <div className="flex-1 min-h-0 flex flex-col justify-center items-center pt-8 h-full ">
        <ModelCardCarousel isActive={isActive} />
      </div>

      <div className="shrink-0 px-5 pt-4 pb-10 flex flex-col gap-8 text-center relative z-10 bg-white/5   backdrop-blur-xs border-t-white">
        <div className="flex flex-col gap-2">
          <h1
            ref={titleRef}
            className="text-[32px]/[105%] font-[500] text-black tracking-[-0.03em]"
          >
            Стань моделью.<br />Уже сейчас
          </h1>
          <p
            ref={subtitleRef}
            className="text-[#7F7F7F] text-[16px]/[125%] font-medium"
          >
            Подзаголовок нужно сделать тут, ну короче сделать текст надо здесь
          </p>
        </div>
        <button
          ref={btnRef}
          onClick={onStart}
          className="w-full flex items-center gap-2.5 justify-center py-3.5 rounded-full bg-[#333333] text-white text-base/[100%] font-medium active:opacity-80 transition-opacity max-w-[191px] mx-auto"
        >
          Начать
          <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.28613 8.04705H12.6195M8.00018 12.7611L12.7142 8.04705L8.00018 3.33301"
              stroke="white"
              strokeWidth="1.33333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}