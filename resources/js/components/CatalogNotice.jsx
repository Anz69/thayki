import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import FaqModal from '@/components/modals/FaqModal'

const ROTATE_MS = 5500
const SWIPE_THRESHOLD = 40

export default function CatalogNotice() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
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
      <style>{`
        @keyframes cnGrow{from{width:0%}to{width:100%}}
        @keyframes cnSpin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
      `}</style>

      <div className="relative overflow-hidden" style={{ borderRadius: 16, padding: 1.5 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', top: '50%', left: '50%', width: '220%', aspectRatio: '1',
            background: 'conic-gradient(from 180deg at 50% 50%, #E2319B 0deg, #B331E2 68.4deg, #E2314C 360deg)',
            animation: 'cnSpin 4s linear infinite',
          }}
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-stretch gap-[3px] bg-white rounded-full px-1 z-50" style={{ height: 1.5, width: '82%' }}>
          {PHRASES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Слайд ${i + 1}`}
              className="flex-1 h-full overflow-hidden rounded-full bg-[#E2E0E8]"
            >
              <span
                key={i === idx ? `run-${idx}` : `seg-${i}`}
                className="block h-full bg-[#E2319B] rounded-full"
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

        <div className="relative" style={{ background: '#F5F5F7', borderRadius: 14.5 }}>
          <div className="px-4 pt-5 pb-4 flex flex-col items-center gap-4">
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
            <div className="flex flex-col gap-2 w-full items-center">
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
              <button
                onClick={() => navigate('/request')}
                className="w-full py-2.5 rounded-full bg-[#E2319B] text-white text-[14px]/[100%] font-medium active:scale-[0.98] transition-transform shadow-[0_8px_20px_rgba(226,49,155,0.32)]"
              >
                {t('request.title')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <HowItWorksModal isOpen={howOpen} onClose={() => setHowOpen(false)} />
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
