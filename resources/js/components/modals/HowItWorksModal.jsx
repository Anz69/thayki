import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import HowItWorksStep1 from '@/components/sections/howItWorks/Step1'
import HowItWorksStep2 from '@/components/sections/howItWorks/Step2'
import HowItWorksStep3 from '@/components/sections/howItWorks/Step3'
import { useCompactMode } from '@/composables/useCompactMode'
import { useTranslation } from 'react-i18next'
const STEPS = ['s1', 's2', 's3']
const STEP_CONTENT = [HowItWorksStep1, HowItWorksStep2, HowItWorksStep3]
const DUR_OUT = 0.20   // уходящий слайд исчезает быстро
const DUR_IN  = 0.46   // входящий плавно тормозит
export default function HowItWorksModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [stepIdx, setStepIdx] = useState(0)
  const isCompact = useCompactMode()
  const slidesRef    = useRef([])
  const stepRef      = useRef(0)
  const animating    = useRef(false)
  const footerWrapRef  = useRef(null)
  const pillRef        = useRef(null)
  const titleRef       = useRef(null)
  const subtitleRef    = useRef(null)
  const prevFooterH    = useRef(null)
  const skipFooterAnim = useRef(true)
  const isForwardRef   = useRef(true)
  useEffect(() => {
    if (!isOpen) {
      skipFooterAnim.current = true
      animating.current      = false
      const t = setTimeout(() => {
        setStepIdx(0)
        stepRef.current = 0
      }, 420)
      return () => clearTimeout(t)
    }
    slidesRef.current.forEach((el, i) => {
      if (!el) return
      gsap.killTweensOf(el)
      gsap.set(el, {
        clearProps: 'xPercent,x,scale',
        autoAlpha: i === 0 ? 1 : 0,
        pointerEvents: i === 0 ? 'auto' : 'none',
      })
    })
  }, [isOpen])
  useLayoutEffect(() => {
    const els = [pillRef.current, titleRef.current, subtitleRef.current].filter(Boolean)
    if (!els.length || !footerWrapRef.current) return
    if (skipFooterAnim.current) {
      skipFooterAnim.current = false
      gsap.set(els, { clearProps: 'all' })
      return
    }
    const wrap = footerWrapRef.current
    const newH  = wrap.offsetHeight
    if (prevFooterH.current !== null && Math.abs(prevFooterH.current - newH) > 1) {
      gsap.killTweensOf(wrap)
      gsap.set(wrap, { height: prevFooterH.current })
      gsap.to(wrap, {
        height: newH,
        duration: 0.40,
        ease: 'power3.inOut',
        onComplete: () => gsap.set(wrap, { clearProps: 'height' }),
      })
    }
    prevFooterH.current = null
    const fromY = isForwardRef.current ? 14 : -14
    gsap.killTweensOf(els)
    gsap.set(els, { y: fromY, autoAlpha: 0 })
    gsap.to(els, {
      y: 0,
      autoAlpha: 1,
      duration: 0.34,
      stagger: 0.05,
      ease: 'power3.out',
      delay: 0.22,   // появляется когда входящий слайд уже почти на месте
      clearProps: 'transform,opacity,visibility',
    })
  }, [stepIdx])
  const goTo = useCallback((next) => {
    const prev = stepRef.current
    if (prev === next || animating.current) return
    const prevEl = slidesRef.current[prev]
    const nextEl = slidesRef.current[next]
    if (!prevEl || !nextEl) return
    animating.current  = true
    stepRef.current    = next
    const forward      = next > prev
    isForwardRef.current = forward
    if (footerWrapRef.current) {
      gsap.killTweensOf(footerWrapRef.current)
      gsap.set(footerWrapRef.current, { clearProps: 'height' })
      prevFooterH.current = footerWrapRef.current.offsetHeight
    }
    gsap.set(nextEl, {
      xPercent: forward ? 100 : -100,
      autoAlpha: 1,
      pointerEvents: 'none',
    })
    const tl = gsap.timeline({
      onComplete() {
        gsap.set(prevEl, { autoAlpha: 0, xPercent: 0, pointerEvents: 'none' })
        gsap.set(nextEl, { pointerEvents: 'auto' })
        animating.current = false
      },
    })
    tl.to(prevEl, {
      xPercent: forward ? -22 : 22,
      autoAlpha: 0,
      duration: DUR_OUT,
      ease: 'power2.out',
    })
    tl.to(nextEl, {
      xPercent: 0,
      duration: DUR_IN,
      ease: 'expo.out',
    }, 0)
    setStepIdx(next)
  }, [])
  const handleBack = useCallback(() => {
    if (stepRef.current === 0) { onClose(); return }
    goTo(stepRef.current - 1)
  }, [goTo, onClose])
  const handleNext = useCallback(() => {
    if (stepRef.current === STEPS.length - 1) { onClose(); return }
    goTo(stepRef.current + 1)
  }, [goTo, onClose])
  const stepKey = STEPS[stepIdx]
  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <button
            onClick={handleBack}
            className="px-2.5 py-3 rounded-full bg-[#F5F5F7] text-black text-sm/[100%] font-medium active:bg-[#EBEBEB] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="text-black text-base/[100%] font-medium">{t('hiw.title')}</span>
          <button
            onClick={handleNext}
            className="px-2.5 py-3 rounded-full bg-[#F5F5F7] text-black text-sm/[100%] font-medium active:bg-[#EBEBEB] transition-colors"
          >
            {stepIdx < STEPS.length - 1 ? t('hiw.next') : t('hiw.done')}
          </button>
        </div>
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {STEP_CONTENT.map((StepComp, i) => (
            <div
              key={`slide-${i}`}
              ref={(el) => { slidesRef.current[i] = el }}
              className="flex flex-col"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: -i,
                opacity:       i === 0 ? 1 : 0,
                visibility:    i === 0 ? 'visible' : 'hidden',
                pointerEvents: i === 0 ? 'auto' : 'none',
              }}
            >
              <StepComp isActive={stepIdx === i} />
            </div>
          ))}
        </div>
        <div ref={footerWrapRef} className={`shrink-0 overflow-hidden flex items-start justify-start bg-white/15 border-t-white backdrop-blur-sm ${isCompact ? 'min-h-[180px] pt-2' : 'min-h-[224px] pt-3'}`}>
          <div className="flex flex-col items-center w-full text-center">
            <div
              ref={pillRef}
              className={`px-4 py-1.5 rounded-full bg-[#F5F5F7] inline-block ${isCompact ? 'mb-3' : 'mb-4'}`}
            >
              <span className="text-black text-sm/[100%] font-medium">
                {t('hiw.step', { n: stepIdx + 1, total: STEPS.length })}
              </span>
            </div>
            <h2
              ref={titleRef}
              className={`font-medium text-black mb-2.5 ${isCompact ? 'text-[20px]/[116%]' : 'text-[24px]/[116%]'}`}
            >
              {t(`hiw.${stepKey}t`)}
            </h2>
            <p
              ref={subtitleRef}
              className="max-w-[300px] text-[14px]/[130%] font-medium text-[#8A8A8A] line-clamp-2"
            >
              {t(`hiw.${stepKey}s`)}
            </p>
          </div>
        </div>
      </div>
    </ModalSheet>
  )
}