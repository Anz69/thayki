import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

  // Collapse the wishes section before first paint (GSAP owns height/opacity/
  // overflow so React re-renders — e.g. typing — never reset them).
  useLayoutEffect(() => {
    const el = extraRef.current
    if (el) gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' })
  }, [])

  // Reveal the wishes section on step 2 with a smooth auto-height tween.
  useEffect(() => {
    const el = extraRef.current
    if (!el || step !== 2) return undefined
    gsap.killTweensOf(el)
    gsap.set(el, { height: 'auto' })
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
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}`, { replace: true })
    } catch (err) {
      logError(err)
      setSubmitting(false)
    }
  }

  const primaryBtn = (label, onClick, enabled) => (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={[
        'w-full py-4 rounded-full text-base/[100%] font-semibold transition-all duration-200 active:scale-[0.98]',
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
          <CitySelect value={city} onChange={setCity} placeholder={t('request.cityPlaceholder')} />
        </div>

        {/* Wishes — revealed on step 2 with a smooth height transition */}
        <div ref={extraRef}>
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

        {step === 1
          ? primaryBtn(t('request.next'), goNext, cityFilled)
          : primaryBtn(submitting ? t('request.submitting') : t('request.submit'), handleSubmit, canSubmit)}
      </div>
    </ModalMiddle>
  )
}
