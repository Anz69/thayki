import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import gsap from 'gsap'
import { useNavigate } from 'react-router-dom'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import { resetModelAppGuardCache } from '@/RouterShell'
import BecomeModelLanding from '@/components/becomeModel/Landing'
import Step1Name   from '@/components/becomeModel/steps/Step1Name'
import Step2Age    from '@/components/becomeModel/steps/Step2Age'
import Step3Info   from '@/components/becomeModel/steps/Step3Info'
import Step4Photos from '@/components/becomeModel/steps/Step4Photos'
import Step5Prices from '@/components/becomeModel/steps/Step5Prices'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'

function firstValidationDetailMessage(details) {
  if (details == null || typeof details !== 'object') return null
  for (const msgs of Object.values(details)) {
    if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === 'string') return msgs[0]
    if (typeof msgs === 'string' && msgs) return msgs
  }
  return null
}

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

function BecomeModelPrecheckBlocking({ onToMeetings, onToHome }) {
  return (
    <section className="min-h-dvh bg-white flex flex-col px-5 pt-14 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-6">
        <div className="rounded-2xl bg-[#F5F5F7] p-6 flex flex-col gap-5 shadow-sm">
          <div className="size-16 rounded-full bg-[#FDE8F5] flex items-center justify-center mx-auto ring-4 ring-white">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M8 7V5a4 4 0 118 0v2M6 7h12v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7z" stroke="#E2319B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-[22px] font-semibold text-black tracking-tight leading-tight">
              Сначала заказы как клиент
            </h1>
            <p className="text-[15px] text-[#7F7F7F] leading-relaxed font-medium">
              У вас есть активные бронирования. Завершите или отмените их — после этого можно подать заявку на модель.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={onToMeetings}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base font-semibold active:opacity-85 transition-opacity"
            >
              К моим заказам
            </button>
            <button
              type="button"
              onClick={onToHome}
              className="w-full py-4 rounded-full bg-white border border-[#E1E0E7] text-black text-base font-medium active:bg-[#F5F5F7] transition-colors"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function BecomeModelPage() {
  const navigate = useTransitionNavigate()
  const navigateImmediate = useNavigate()
  const authStore = useAuthStore()
  const initialStep = 0

  const [precheck, setPrecheck] = useState( ('loading'))
  const [stepIdx, setStepIdx]     = useState(initialStep)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const stepRef   = useRef(initialStep)
  const slidesRef = useRef([])
  const animating = useRef(false)
  const formData  = useRef({})

  useEffect(() => {
    let cancelled = false

    async function runPrecheck() {
      try {
        let appData = null
        try {
          const appRes = await api.get('/model-application')
          appData = appRes?.data?.data ?? null
        } catch (err) {
          if (err?.response?.status !== 404) {
            if (!cancelled) setPrecheck('ready')
            return
          }
        }

        if (cancelled) return

        if (appData?.status === 'submitted') {
          resetModelAppGuardCache()
          navigateImmediate('/application-pending', { replace: true })
          return
        }
        if (appData?.status === 'approved') {
          resetModelAppGuardCache()
          navigateImmediate('/home', { replace: true })
          void useAuthStore.getState().refreshUser().catch(() => {})
          return
        }

        const meetingsRes = await api.get('/meetings', {
          params: {
            per_page: 1,
            role: 'client',
            statuses: 'pending,accepted,paid,confirmed',
          },
        })

        if (cancelled) return

        const meetings = meetingsRes?.data?.data ?? []
        if (Array.isArray(meetings) && meetings.length > 0) {
          setPrecheck('blocked')
          return
        }

        setPrecheck('ready')
      } catch {
        if (!cancelled) setPrecheck('ready')
      }
    }

    runPrecheck()

    return () => {
      cancelled = true
    }
  }, [navigateImmediate])

  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    if (!vv) return undefined
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--keyboard-offset', `${overlap}px`)
    }
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.removeProperty('--keyboard-offset')
    }
  }, [])

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
        resetModelAppGuardCache()
        try {
          await authStore.refreshUser()
        } catch {
        }
        navigate('/application-pending', { replace: true })
      } catch (err) {
        const errData = err?.response?.data?.error
        if (errData?.code === 'APPLICATION_ALREADY_SUBMITTED') {
          resetModelAppGuardCache()
          try {
            await authStore.refreshUser()
          } catch {
          }
          navigate('/application-pending', { replace: true })
          return
        }
        if (errData?.code === 'ACTIVE_MEETINGS_AS_CLIENT') {
          setPrecheck('blocked')
          setSubmitting(false)
          return
        }
        const validationMsg =
          errData?.code === 'VALIDATION_FAILED'
            ? firstValidationDetailMessage(errData?.details)
            : null
        const msg =
          validationMsg
          ?? errData?.message
          ?? err?.response?.data?.message
          ?? err?.message
          ?? 'Ошибка. Попробуйте ещё раз'
        setSubmitError(msg)
        setSubmitting(false)
      }
    } else {
      goTo(nextIdx)
    }
  }, [goTo, navigate, authStore])

  const goMeetings = useCallback(() => navigate('/meeting'), [navigate])
  const goHome = useCallback(() => navigate('/home'), [navigate])

  const handleBack = useCallback(() => {
    if (stepRef.current === 0) {
      navigate(-1)
    } else {
      goTo(stepRef.current - 1)
    }
  }, [goTo, navigate])

  if (precheck === 'loading') {
    return (
      <section className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 gap-4">
        <div
          className="size-11 rounded-full border-[3px] border-[#FDE8F5] border-t-[#E2319B] animate-spin"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#7F7F7F]">Проверяем данные…</p>
      </section>
    )
  }

  if (precheck === 'blocked') {
    return (
      <BecomeModelPrecheckBlocking onToMeetings={goMeetings} onToHome={goHome} />
    )
  }

  return (
    <section
      className="min-h-dvh bg-white relative overflow-hidden"
      style={{
        paddingBottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + var(--keyboard-offset, 0px))',
      }}
    >
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
