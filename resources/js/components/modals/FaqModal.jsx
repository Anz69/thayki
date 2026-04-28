import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
const FAQ_ITEMS = [
  {
    id: 1,
    question: 'Как выбрать подходящую модель?',
    answer: 'Просмотрите анкеты моделей, обратите внимание на фото, описание и рейтинг. Вы можете фильтровать по параметрам внешности и графику работы.',
  },
  {
    id: 2,
    question: 'Как происходит оплата встречи?',
    answer: 'Оплата производится через приложение банковской картой или криптовалютой. Средства хранятся в сервисе до завершения встречи, после чего переводятся модели.',
  },
  {
    id: 3,
    question: 'Можно ли отменить бронирование?',
    answer: 'Да, бронирование можно отменить не позднее чем за 2 часа до встречи. В таком случае возврат средств происходит в течение 1–3 рабочих дней.',
  },
  {
    id: 4,
    question: 'Как связаться с моделью перед встречей?',
    answer: 'После подтверждения бронирования вам открывается чат с моделью. Там вы можете уточнить детали встречи.',
  },
  {
    id: 5,
    question: 'Что делать, если модель не пришла?',
    answer: 'Если модель не явилась в течение 30 минут, вы можете отметить это в приложении. Встреча будет отменена, а средства возвращены в полном объёме.',
  },
]
function AccordionItem({ item, isOpen, onToggle }) {
  const bodyRef    = useRef(null)
  const chevronRef = useRef(null)
  const toggle = useCallback(() => {
    const el = bodyRef.current
    if (!el) return

    gsap.killTweensOf(el)
    gsap.killTweensOf(chevronRef.current)

    if (isOpen) {
      const currentH = parseFloat(gsap.getProperty(el, 'height')) || el.offsetHeight
      gsap.fromTo(el,
        { height: currentH },
        { height: 0, duration: 0.26, ease: 'power2.inOut' },
      )
      gsap.to(chevronRef.current, { rotation: 0, duration: 0.2, ease: 'power2.inOut' })
    } else {
      gsap.set(el, { height: 'auto' })
      const h = el.scrollHeight
      gsap.fromTo(el,
        { height: 0 },
        { height: h, duration: 0.32, ease: 'power3.out', onComplete: () => gsap.set(el, { height: 'auto' }) },
      )
      gsap.to(chevronRef.current, { rotation: 180, duration: 0.2, ease: 'power2.inOut' })
    }
    onToggle(item.id)
  }, [isOpen, item.id, onToggle])
  useEffect(() => {
    if (chevronRef.current) gsap.set(chevronRef.current, { rotation: isOpen ? 180 : 0 })
    if (bodyRef.current)    gsap.set(bodyRef.current,    { height: isOpen ? 'auto' : 0 })
  }, []) 
  return (
    <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 gap-3 text-left active:bg-[#ECEAEC] transition-colors"
      >
        <span className="text-black text-[15px]/[130%] font-medium flex-1">{item.question}</span>
        <div ref={chevronRef} className="shrink-0" style={{ display: 'flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      <div ref={bodyRef} style={{ height: 0, overflow: 'hidden' }}>
        <p className="px-5 pb-5 text-[#7F7F7F] text-sm/[150%] font-normal">
          {item.answer}
        </p>
      </div>
    </div>
  )
}
export default function FaqModal({ isOpen, onClose }) {
  const [openId, setOpenId] = useState(null)
  const toggle = useCallback((id) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])
  useEffect(() => {
    if (!isOpen) setOpenId(null)
  }, [isOpen])
  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Назад
        </button>
        <h2 className="text-base/[100%] font-[500] text-black">F.A.Q</h2>
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Готово
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <h3 className="text-2xl/[100%] font-[500] text-black mb-6">
          Не нашли ответа в функционале нашего приложения?
        </h3>
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={toggle}
            />
          ))}
        </div>
      </div>
    </ModalSheet>
  )
}