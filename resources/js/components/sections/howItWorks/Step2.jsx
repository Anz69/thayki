import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { CRYPTOS } from '@/constants/payments'
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M7 5L11 9L7 13"
      stroke="#C4C4C4"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
export default function HowItWorksStep2({ isActive }) {
  const cryptoRef = useRef(null)
  const sbpRef    = useRef(null)
  const didEnter  = useRef(false)
  useEffect(() => {
    if (!isActive || didEnter.current) return
    didEnter.current = true
    const btns = [cryptoRef.current, sbpRef.current].filter(Boolean)
    gsap.fromTo(
      btns,
      { y: 28, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.50,
        stagger: 0.10,
        ease: 'power3.out',
        delay: 0.08,
        clearProps: 'transform,opacity,visibility',
      },
    )
  }, [isActive])
  return (
    <div className="flex flex-col justify-center flex-1 px-5 gap-3 ">
      <div
        ref={cryptoRef}
        className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-4 w-full"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {CRYPTOS.map((c, i) => (
              <img
                key={c.id}
                src={c.icon}
                alt={c.name}
                className="w-7 h-7 object-cover relative"
                style={{ zIndex: CRYPTOS.length + i }}
              />
            ))}
          </div>
          <span className="text-black text-base/[100%] font-medium">Криптовалюта</span>
        </div>
        <ChevronRight />
      </div>
      <div
        ref={sbpRef}
        className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-4 w-full"
      >
        <div className="flex items-center gap-3">
          <img src="/img/payments/spb.png" alt="СБП" className="w-7 h-7 object-contain" />
          <span className="text-black text-base/[100%] font-medium">СБП</span>
        </div>
        <ChevronRight />
      </div>
    </div>
  )
}