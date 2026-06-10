import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import useBookingStore from '@/stores/useBookingStore'
import useMeetingStore from '@/stores/useMeetingStore'
import DateStep from '@/components/sections/modalRegistration/DateStep'
import TimeStep from '@/components/sections/modalRegistration/TimeStep'
import DurationStep from '@/components/sections/modalRegistration/DurationStep'
import FinishStep from '@/components/sections/modalRegistration/FinishStep'
const STEPS = [DateStep, TimeStep, DurationStep, FinishStep]
export default function RegistrationModal() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const store = useBookingStore()
  const meetingStore = useMeetingStore()
  const stepRefs = useRef([])
  const stepWrapRef = useRef(null)
  const heartRef = useRef(null)
  const prevStep = useRef(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  useEffect(() => {
    if (!store.isOpen) return
    const id = setTimeout(() => {
      if (!heartRef.current) return
      gsap.killTweensOf(heartRef.current)
      gsap.set(heartRef.current, { x: -16, y: 5, opacity: 0, scale: 0.55, rotation: 4 })
      gsap.to(heartRef.current, {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: 15,
        duration: 0.7,
        ease: 'back.out(2.2)',
      })
    }, 220)
    return () => clearTimeout(id)
  }, [store.isOpen])
  useEffect(() => {
    if (!store.isOpen) return
    prevStep.current = 1
    stepRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.killTweensOf(el)
      if (i === 0) {
        gsap.set(el, {
          position: 'relative',
          visibility: 'visible',
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'none',
          pointerEvents: 'auto',
          zIndex: 'auto',
          clearProps: 'width,left',
        })
      } else {
        gsap.set(el, {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          visibility: 'hidden',
          opacity: 0,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'none',
          pointerEvents: 'none',
          zIndex: 0,
          clearProps: 'width',
        })
      }
    })
    if (stepWrapRef.current) {
      gsap.set(stepWrapRef.current, { clearProps: 'height' })
    }
  }, [store.isOpen])
  useEffect(() => {
    const prev = prevStep.current
    const curr = store.step
    if (prev === curr) return
    const dir = curr > prev ? 1 : -1
    prevStep.current = curr
    const prevEl = stepRefs.current[prev - 1]
    const currEl = stepRefs.current[curr - 1]
    const wrapEl = stepWrapRef.current
    if (!prevEl || !currEl || !wrapEl) return
    gsap.killTweensOf([prevEl, currEl, wrapEl])
    const currentHeight = wrapEl.offsetHeight
    gsap.set(wrapEl, { height: currentHeight })
    const prevElLeft  = prevEl.offsetLeft
    const prevElWidth = prevEl.offsetWidth
    gsap.set(currEl, {
      position: 'absolute',
      top: 0,
      left: prevElLeft,
      width: prevElWidth,
      visibility: 'visible',
      opacity: 0,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'none',
      pointerEvents: 'none',
      zIndex: -1,
    })
    const newHeight = currEl.offsetHeight
    gsap.to(wrapEl, {
      height: newHeight,
      duration: 0.46,
      ease: 'power3.inOut',
      onComplete: () => gsap.set(wrapEl, { clearProps: 'height' }),
    })
    gsap.set(prevEl, {
      position: 'absolute',
      top: 0,
      left: prevElLeft,
      width: prevElWidth,
      zIndex: 0,
      willChange: 'transform, opacity',
      pointerEvents: 'none',
    })
    gsap.to(prevEl, {
      opacity: 0,
      y: dir > 0 ? 22 : -22,
      scale: 0.988,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(prevEl, {
          visibility: 'hidden',
          opacity: 0,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'none',
          pointerEvents: 'none',
          zIndex: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          clearProps: 'width,willChange',
        })
      },
    })
    const stepRoot = currEl.children[0]
    const innerBlocks = stepRoot
      ? Array.from(stepRoot.children).filter(el => el.tagName !== 'STYLE')
      : []
    const summaryRows = curr === 4
      ? Array.from(currEl.querySelectorAll('.summary-row'))
      : []
    gsap.killTweensOf(innerBlocks)
    if (summaryRows.length) gsap.killTweensOf(summaryRows)
    gsap.set(currEl, {
      position: 'relative',
      visibility: 'visible',
      zIndex: 1,
      willChange: 'transform',
      pointerEvents: 'none',
      opacity: 1,
      x: 0,
      y: dir > 0 ? -32 : 32,
      scale: 0.97,
      clearProps: 'width,left',
    })
    gsap.set(innerBlocks, { opacity: 0, y: 20 })
    if (summaryRows.length) gsap.set(summaryRows, { opacity: 0, y: 10 })
    gsap.to(currEl, {
      y: 0,
      scale: 1,
      duration: 0.34,
      ease: 'power3.out',
      onComplete: () => {
        gsap.set(currEl, {
          clearProps: 'y,scale,zIndex,willChange',
          pointerEvents: 'auto',
        })
      },
    })
    gsap.to(innerBlocks, {
      opacity: 1,
      y: 0,
      duration: 0.44,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.1,
      onComplete: () => gsap.set(innerBlocks, { clearProps: 'opacity,y' }),
    })
    if (summaryRows.length) {
      gsap.to(summaryRows, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.06,
        ease: 'power3.out',
        delay: 0.22,
        onComplete: () => gsap.set(summaryRows, { clearProps: 'opacity,y' }),
      })
    }
  }, [store.step])
  const isButtonDisabled =
    submitting ||
    (store.step === 1 ? !store.selectedDate
      : store.step === 2 ? !store.isTimeValid()
      : store.step === 3 ? !store.selectedDuration
      : false)
  const buttonLabel = submitting
    ? t('booking.submitting')
    : store.step === 4
      ? t('booking.book')
      : store.step === 3 && !store.selectedDuration
        ? t('booking.selectDuration')
        : store.step === 2 && !store.isTimeValid()
          ? t('booking.selectTime')
          : t('booking.nextStep')
  const handleNext = async () => {
    if (isButtonDisabled) return
    if (store.step === 4) {
      setSubmitting(true)
      setSubmitError(null)
      try {
        const newMeeting = await store.submit()
        meetingStore.setMeeting(newMeeting)
        store.close()
        navigate(`/meeting?id=${newMeeting.id}`)
      } catch (err) {
        const details = err?.response?.data?.error?.details
        const apiMsg  = err?.response?.data?.error?.message
        const msg = details
          ? Object.values(details).flat().join(' ')
          : apiMsg ?? err?.message ?? t('booking.errorRetry')
        setSubmitError(msg)
      } finally {
        setSubmitting(false)
      }
      return
    }
    store.nextStep()
  }
  return (
    <ModalMiddle isOpen={store.isOpen} onClose={store.close}>
      <header className="flex items-center justify-between px-5 pt-4 pb-5 shrink-0">
        <div className="relative w-14 h-10">
          <div className="size-[42px] bg-[#232323] rounded-xl items-center justify-center flex absolute left-0 top-0 z-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 2V6M16 2V6M3 10H21M7.8 22H16.2C17.8802 22 18.7202 22 19.362 21.673C19.9265 21.3854 20.3854 20.9265 20.673 20.362C21 19.7202 21 18.8802 21 17.2V8.8C21 7.11984 21 6.27976 20.673 5.63803C20.3854 5.07354 19.9265 4.6146 19.362 4.32698C18.7202 4 17.8802 4 16.2 4H7.8C6.11984 4 5.27976 4 4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 5.63803C3 6.27976 3 7.11984 3 8.8V17.2C3 18.8802 3 19.7202 3.32698 20.362C3.6146 20.9265 4.07354 21.3854 4.63803 21.673C5.27976 22 6.11984 22 7.8 22ZM11.9979 14.0728C11.3774 13.3676 10.3428 13.1779 9.56546 13.8236C8.7881 14.4694 8.67866 15.549 9.28912 16.3127C9.89959 17.0765 11.9979 18.859 11.9979 18.859C11.9979 18.859 14.0962 17.0765 14.7066 16.3127C15.3171 15.549 15.221 14.4626 14.4303 13.8236C13.6396 13.1847 12.6183 13.3676 11.9979 14.0728Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            ref={heartRef}
            className="size-[42px] bg-white shadow-md border border-black/[0.08] rounded-xl items-center justify-center flex absolute left-[28px] -top-0.5 z-10"
            style={{ opacity: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.1345 5.09013C12.0895 5.14124 12.067 5.1668 12.0425 5.17547C12.0202 5.18335 11.9981 5.18335 11.9758 5.17548C11.9513 5.16681 11.9288 5.14126 11.8838 5.09016C9.87593 2.80991 6.63276 2.23484 4.18342 4.3883C1.68244 6.58716 1.33034 10.2636 3.29437 12.8642C4.65195 14.6617 8.29652 18.1168 10.4178 20.0791C10.9669 20.5869 11.2414 20.8409 11.5679 20.9414C11.8499 21.0282 12.1684 21.0282 12.4504 20.9414C12.7769 20.8409 13.0514 20.5869 13.6005 20.0791C15.7218 18.1168 19.3664 14.6617 20.7239 12.8642C22.688 10.2636 22.3788 6.56403 19.8349 4.3883C17.3435 2.25751 14.1407 2.81083 12.1345 5.09013Z"
                fill="#F64784"
              />
            </svg>
          </div>
        </div>
        <button
          onClick={store.close}
          className="size-10 bg-[#F0F0F0] rounded-full items-center justify-center flex active:bg-[#E4E4E4] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M5.29639 5.29639L10.5926 10.5926M10.5926 10.5926L15.8887 15.8887M10.5926 10.5926L15.8887 5.29639M10.5926 10.5926L5.29639 15.8887"
              stroke="#7F7F7F"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div
        ref={stepWrapRef}
        className="px-5"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {STEPS.map((Step, i) => (
          <div
            key={`step-${i}`}
            ref={(el) => (stepRefs.current[i] = el)}
            style={
              i === 0
                ? { position: 'relative' }
                : {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  visibility: 'hidden',
                  opacity: 0,
                  pointerEvents: 'none',
                }
            }
          >
            <Step />
          </div>
        ))}
      </div>
      <div className="px-6 pb-6 pt-2 shrink-0 flex flex-col gap-3">
        {submitError && (
          <p className="text-[#E2319B] text-sm/[140%] font-medium text-center px-2">
            {submitError}
          </p>
        )}
        <button
          onClick={handleNext}
          disabled={isButtonDisabled}
          className={[
            'w-full py-4 rounded-full text-base/[100%] font-semibold transition-all duration-200 active:scale-[0.98]',
            isButtonDisabled
              ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
              : 'bg-[#E2319B] text-white',
          ].join(' ')}
        >
          {buttonLabel}
        </button>
      </div>
    </ModalMiddle>
  )
}