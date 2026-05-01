import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import gsap from 'gsap'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import BecomeModelLanding from '@/components/becomeModel/Landing'
import Step1Name   from '@/components/becomeModel/steps/Step1Name'
import Step2Age    from '@/components/becomeModel/steps/Step2Age'
import Step3Info   from '@/components/becomeModel/steps/Step3Info'
import Step4Photos from '@/components/becomeModel/steps/Step4Photos'
import Step5Prices from '@/components/becomeModel/steps/Step5Prices'
import api from '@/utils/api'

/** Map collected form data to the POST /model-application payload */
function buildApplicationPayload(data) {
  const prices       = data.prices ?? {}
  const priceOptions = []
  if (prices.hour)       priceOptions.push({ label: '1 час',  hours: 1,  price_thb: Number(prices.hour) })
  if (prices.threeHours) priceOptions.push({ label: '3 часа', hours: 3,  price_thb: Number(prices.threeHours) })
  if (prices.night)      priceOptions.push({ label: 'Ночь',   hours: 8,  price_thb: Number(prices.night) })
  if (prices.day)        priceOptions.push({ label: '24 ч',   hours: 24, price_thb: Number(prices.day) })

  const hourlyRate = prices.hour
    ? Math.max(100, Number(prices.hour))
    : prices.threeHours
      ? Math.max(100, Math.ceil(Number(prices.threeHours) / 3))
      : 100

  return {
    display_name:    data.name,
    age:             Number(data.age),
    height_cm:       data.height ? Number(data.height) : undefined,
    weight_kg:       data.weight ? Number(data.weight) : undefined,
    bust_size:       data.bust         ?? undefined,
    butt_size:       data.butt         ?? undefined,
    schedule:        'any',
    hourly_rate_thb: hourlyRate,
    price_options:   priceOptions,
    photos:          Array.isArray(data.photos) ? data.photos : undefined,
  }
}

const TOTAL_STEPS = 5
const SCREENS = [
  { component: BecomeModelLanding, isLanding: true },
  { component: Step1Name,   stepNum: 1 },
  { component: Step2Age,    stepNum: 2 },
  { component: Step3Info,   stepNum: 3 },
  { component: Step4Photos, stepNum: 4 },
  { component: Step5Prices, stepNum: 5 },
]

const DUR_OUT = 0.28
const DUR_IN  = 0.48

export default function BecomeModelPage() {
  const navigate = useTransitionNavigate()
  const initialStep = 0

  const [stepIdx, setStepIdx]     = useState(initialStep)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const stepRef   = useRef(initialStep)
  const slidesRef = useRef([])
  const animating = useRef(false)
  const formData  = useRef({})

  useEffect(() => {
    let cancelled = false

    api.get('/model-application')
      .then((res) => {
        if (cancelled) return
        const status = res?.data?.data?.status
        if (status === 'submitted') {
          navigate('/application-pending', { replace: true })
          return
        }
        navigate('/home', { replace: true })
      })
      .catch((err) => {
        if (cancelled) return
        const status = err?.response?.status
        if (status === 404) return
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  useLayoutEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, {
        autoAlpha:    i === stepRef.current ? 1 : 0,
        xPercent:     0,
        pointerEvents: i === stepRef.current ? 'auto' : 'none',
      })
    })
  }, [])

  const goTo = useCallback((next) => {
    const prev = stepRef.current
    if (prev === next || animating.current) return
    animating.current = true
    stepRef.current   = next
    const forward     = next > prev
    const prevEl = slidesRef.current[prev]
    const nextEl = slidesRef.current[next]
    if (!prevEl || !nextEl) return

    gsap.set(nextEl, { xPercent: forward ? 100 : -100, autoAlpha: 1, pointerEvents: 'none' })
    const tl = gsap.timeline({
      onComplete() {
        gsap.set(prevEl, { autoAlpha: 0, xPercent: 0, pointerEvents: 'none' })
        gsap.set(nextEl, { pointerEvents: 'auto' })
        animating.current = false
        setStepIdx(next)
      },
    })
    tl.to(prevEl, { xPercent: forward ? -22 : 22, autoAlpha: 0, duration: DUR_OUT, ease: 'power2.inOut' })
    tl.to(nextEl, { xPercent: 0, autoAlpha: 1, duration: DUR_IN,  ease: 'power3.out' }, 0)
  }, [])

  const handleStart = useCallback(() => goTo(1), [goTo])

  const handleNext = useCallback(async (data = {}) => {
    formData.current = { ...formData.current, ...data }
    const nextIdx = stepRef.current + 1
    if (nextIdx >= SCREENS.length) {
      setSubmitting(true)
      setSubmitError(null)
      try {
        const payload = buildApplicationPayload(formData.current)
        await api.post('/model-application', payload, {
          headers: { 'Idempotency-Key': `model-app-${Date.now()}` },
        })
        navigate('/application-pending', { replace: true })
      } catch (err) {
        const errData = err?.response?.data?.error
        if (errData?.code === 'APPLICATION_ALREADY_SUBMITTED') {
          navigate('/application-pending', { replace: true })
          return
        }
        const msg = errData?.message ?? err?.response?.data?.message ?? err?.message ?? 'Ошибка. Попробуйте ещё раз'
        setSubmitError(msg)
        setSubmitting(false)
      }
    } else {
      goTo(nextIdx)
    }
  }, [goTo, navigate])

  const handleBack = useCallback(() => {
    if (stepRef.current === 0) {
      navigate(-1)
    } else {
      goTo(stepRef.current - 1)
    }
  }, [goTo, navigate])

  return (
    <section className="min-h-dvh bg-white relative overflow-hidden">
      {SCREENS.map(({ component: Comp, isLanding, stepNum }, i) => (
        <div
          key={`screen-${i}`}
          ref={(el) => { slidesRef.current[i] = el }}
          className="absolute inset-0"
          style={{
            opacity:       i === initialStep ? 1 : 0,
            visibility:    i === initialStep ? 'visible' : 'hidden',
            pointerEvents: i === initialStep ? 'auto' : 'none',
          }}
        >
          {isLanding ? (
            <Comp isActive={stepIdx === i} onStart={handleStart} />
          ) : (
            <Comp
              isActive={stepIdx === i}
              stepNum={stepNum}
              totalSteps={TOTAL_STEPS}
              onNext={handleNext}
              onBack={handleBack}
              submitting={stepNum === TOTAL_STEPS ? submitting : false}
              submitError={stepNum === TOTAL_STEPS ? submitError : null}
            />
          )}
        </div>
      ))}
    </section>
  )
}
