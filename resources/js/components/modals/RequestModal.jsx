import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { buildLeadMessage } from '@/utils/leadMessage'
import { modelName } from '@/utils/modelName'
import CitySelect from '@/components/ui/CitySelect'

/**
 * "Интересует этот типаж" — quick lead modal opened from a prototype card.
 *
 * Two steps: first only the city, then (after «Далее») the extra wishes reveal
 * with a smooth height transition. The bottom sheet is anchored to the bottom,
 * so animating the wishes block height grows the sheet upward smoothly.
 */
export default function RequestModal({ isOpen, onClose, model }) {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const location = useLocation()

  const [step, setStep] = useState(1)
  const [city, setCity] = useState('')
  const [wishes, setWishes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const extraRef = useRef(null)

  const cityFilled = city.trim().length > 0
  const canSubmit = cityFilled && !submitting

  const handleAfterClose = useCallback(() => {
    setStep(1)
    setCity('')
    setWishes('')
    setSubmitting(false)
  }, [])

  // The wishes block is only mounted on step 2 (so it's never visible before
  // «Далее»). Reveal it with a smooth auto-height grow when it appears.
  useEffect(() => {
    const el = extraRef.current
    if (!el || step !== 2) return undefined
    gsap.killTweensOf(el)
    gsap.set(el, { height: 'auto', overflow: 'hidden' })
    const full = el.offsetHeight
    gsap.fromTo(
      el,
      { height: 0, opacity: 0 },
      {
        height: full,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
        onComplete: () => gsap.set(el, { height: 'auto', overflow: 'visible' }),
      },
    )
    return undefined
  }, [step])

  const goNext = () => { if (cityFilled) setStep(2) }

  const handleSubmit = async () => {
    if (!canSubmit || !model) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/leads', {
        model_profile_id: model.id,
        city: city.trim(),
        wishes: wishes.trim() || null,
        message: buildLeadMessage({ t, modelName: modelName(model), city: city.trim(), wishes }),
      }, { headers: { 'Idempotency-Key': `lead-${Date.now()}` } })
      const from = encodeURIComponent(location.pathname || '/home')
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}&from=${from}`, { replace: true })
    } catch (err) {
      logError(err)
      setSubmitting(false)
    }
  }

  const primaryBtn = (label, onClick, enabled) => (
    <button
      onClick={onClick}
      // Keep the focused input from blurring on tap: otherwise the keyboard
      // closes → visualViewport shifts the sheet → the button moves out from
      // under the finger and the first tap is lost (needing a second press).
      onMouseDown={(e) => e.preventDefault()}
      disabled={!enabled}
      className={[
        'w-full py-4 rounded-full text-base/[100%] font-[500] transition-all duration-200 active:scale-[0.98]',
        enabled ? 'bg-[#E2319B] text-white active:opacity-80' : 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose} onAfterClose={handleAfterClose}>
      <div className="flex flex-col gap-4 px-5 pt-2 pb-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-black text-xl/[110%] font-semibold">{t('requestModal.title')}</h2>
          <p className="text-[#7F7F7F] text-sm/[140%] font-medium">{t('requestModal.subtitle')}</p>
        </div>

        {/* City */}
        <div className="flex flex-col gap-2">
          <p className="text-black text-[14px]/[100%] font-medium px-1">
            {t('request.city')} <span className="text-[#E2319B]">*</span>
          </p>
          <CitySelect
            value={city}
            onChange={setCity}
            placeholder={t('request.cityPlaceholder')}
            inline
            overlay={step === 2}
          />
        </div>

        {/* Wishes — mounted & revealed only on step 2 (after «Далее») */}
        {step === 2 && (
          <div ref={extraRef} style={{ overflow: 'hidden' }}>
            <div className="flex flex-col gap-2">
              <p className="text-black text-[14px]/[100%] font-medium px-1">{t('request.wishesExtra')}</p>
              <textarea
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                rows={3}
                placeholder={t('request.wishesPlaceholder')}
                className="w-full bg-[#F5F5F7] rounded-2xl px-4 py-3.5 text-black text-[15px] outline-none placeholder:text-[#ABABAB] resize-none focus:ring-2 focus:ring-[#E2319B]/30 transition-shadow"
              />
            </div>
          </div>
        )}

        {step === 1
          ? primaryBtn(t('request.next'), goNext, cityFilled)
          : primaryBtn(submitting ? t('request.submitting') : t('request.submit'), handleSubmit, canSubmit)}
      </div>
    </ModalMiddle>
  )
}
