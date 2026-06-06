import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import GradientBorder from '@/components/ui/GradientBorder'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import FaqModal from '@/components/modals/FaqModal'

const ROTATE_MS = 5500
const SWIPE_THRESHOLD = 40

export default function CatalogNotice() {
  const { t } = useTranslation()
  const PHRASES = [t('catalogNotice.p1'), t('catalogNotice.p2'), t('catalogNotice.p3')]
  const N = PHRASES.length

  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)

  const timerRef = useRef(null)
  const startX = useRef(null)
  const viewportRef = useRef(null)

  const restartTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % N), ROTATE_MS)
  }

  useEffect(() => {
    restartTimer()
    return () => clearInterval(timerRef.current)
  }, [])

  const goTo = (i) => {
    setIdx(((i % N) + N) % N)
    restartTimer()
  }

  const onPointerDown = (e) => {
    startX.current = e.clientX
    setDragging(true)
    clearInterval(timerRef.current)
    viewportRef.current?.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (startX.current == null) return
    setDrag(e.clientX - startX.current)
  }

  const endDrag = (e) => {
    if (startX.current == null) return
    const dx = (e.clientX ?? startX.current) - startX.current
    const target = idx + (dx < 0 ? 1 : -1)
    if (Math.abs(dx) > SWIPE_THRESHOLD && target >= 0 && target < N) goTo(target)
    else restartTimer()
    startX.current = null
    setDragging(false)
    setDrag(0)
  }

  return (
    <div className="container">
      <style>{`@keyframes cnGrow{from{width:0%}to{width:100%}}`}</style>
      <div className="relative">
        {/* Progress sits ON the top border — one opaque track fully masks the frame line */}
        <div
          className="absolute top-0 inset-x-0 px-4 z-10"
          style={{ transform: 'translateY(-1.5px)' }}
        >
          <div className="flex items-stretch gap-[3px] h-[3px] rounded-full bg-[#E7E5EB] overflow-hidden">
            {PHRASES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Слайд ${i + 1}`}
                className="flex-1 h-full overflow-hidden"
              >
                <span
                  key={i === idx ? `run-${idx}` : `seg-${i}`}
                  className="block h-full bg-[#E2319B]"
                  style={
                    i < idx
                      ? { width: '100%' }
                      : i === idx
                        ? {
                            width: '0%',
                            animation: `cnGrow ${ROTATE_MS}ms linear forwards`,
                            animationPlayState: dragging ? 'paused' : 'running',
                          }
                        : { width: '0%' }
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 pt-4 pb-4 flex flex-col items-center gap-3.5">
          {/* Rotating text — centered, fixed height to avoid layout jumps */}
          <div
            ref={viewportRef}
            className="overflow-hidden select-none w-full"
            style={{ touchAction: 'pan-y', cursor: dragging ? 'grabbing' : 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div
              className="flex items-start"
              style={{
                width: `${N * 100}%`,
                transform: `translateX(calc(${(-idx * 100) / N}% + ${drag}px))`,
                transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {PHRASES.map((p, i) => (
                <div key={i} style={{ width: `${100 / N}%` }} className="shrink-0 flex items-center justify-center min-h-[52px] px-2">
                  <p className="text-center text-[#5B5B5B] text-[13px]/[155%] font-medium pointer-events-none">
                    {p}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full pt-0.5">
            <button
              onClick={() => setHowOpen(true)}
              className="flex-1 py-2.5 rounded-full bg-[#EFEEF3] text-black text-[13px]/[100%] font-medium active:bg-[#E4E3E8] transition-colors"
            >
              {t('catalogNotice.howItWorks')}
            </button>
            <button
              onClick={() => setFaqOpen(true)}
              className="flex-1 py-2.5 rounded-full bg-[#EFEEF3] text-black text-[13px]/[100%] font-medium active:bg-[#E4E3E8] transition-colors"
            >
              {t('catalogNotice.faq')}
            </button>
          </div>
        </GradientBorder>
      </div>

      <HowItWorksModal isOpen={howOpen} onClose={() => setHowOpen(false)} />
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
