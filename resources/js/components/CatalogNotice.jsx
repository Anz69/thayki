import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import GradientBorder from '@/components/ui/GradientBorder'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import FaqModal from '@/components/modals/FaqModal'

const ROTATE_MS = 5500

export default function CatalogNotice() {
  const { t } = useTranslation()
  const PHRASES = [t('catalogNotice.p1'), t('catalogNotice.p2'), t('catalogNotice.p3')]
  const [idx, setIdx] = useState(0)
  const [howOpen, setHowOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const timerRef = useRef(null)
  const touchX = useRef(null)

  const restartTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), ROTATE_MS)
  }

  useEffect(() => {
    restartTimer()
    return () => clearInterval(timerRef.current)
  }, [])

  const goTo = (i) => {
    setIdx(((i % PHRASES.length) + PHRASES.length) % PHRASES.length)
    restartTimer()
  }

  const onTouchStart = (e) => { touchX.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  return (
    <div className="container">
      <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-4 flex flex-col gap-3.5">
        {/* Auto-cycling disclaimer (crossfade; all phrases stacked so height = tallest) */}
        <div className="grid touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {PHRASES.map((p, i) => (
            <p
              key={i}
              style={{ gridArea: '1 / 1', opacity: i === idx ? 1 : 0, transition: 'opacity 0.6s ease' }}
              className="text-[#5B5B5B] text-[12.5px]/[160%] font-medium"
            >
              {p}
            </p>
          ))}
        </div>

        {/* Progress dots (tap to switch) */}
        <div className="flex items-center gap-1.5">
          {PHRASES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Слайд ${i + 1}`}
              className="h-2.5 flex items-center"
            >
              <span
                className="h-1 rounded-full transition-all duration-300 block"
                style={{ width: i === idx ? 16 : 6, background: i === idx ? '#E2319B' : '#D6D4DA' }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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

      <HowItWorksModal isOpen={howOpen} onClose={() => setHowOpen(false)} />
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
