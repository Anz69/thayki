import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import VipGemHero from '@/components/sections/vip/VipGemHero'
import VipLockedCards from '@/components/sections/vip/VipLockedCards'
import { useCompactMode } from '@/composables/useCompactMode'
import { useTranslation } from 'react-i18next'

const STEPS = ['s1', 's2']
const STEP_CONTENT = [VipGemHero, VipLockedCards]
const DUR_OUT = 0.20
const DUR_IN = 0.46

/**
 * V.I.P explainer — same stepped, animated format as HowItWorksModal. The final
 * step's button is "Continue", which hands control back to the request page to
 * switch the form into V.I.P mode.
 */
export default function VipModal({ isOpen, onClose, onContinue }) {
  const { t } = useTranslation()
  const [stepIdx, setStepIdx] = useState(0)
  const isCompact = useCompactMode()
  const slidesRef = useRef([])
  const stepRef = useRef(0)
  const animating = useRef(false)
  const footerWrapRef = useRef(null)
  const pillRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const actionsRef = useRef(null)
  const prevFooterH = useRef(null)
  const skipFooterAnim = useRef(true)
  const isForwardRef = useRef(true)

  useEffect(() => {
    if (!isOpen) {
      skipFooterAnim.current = true
      animating.current = false
      const tm = setTimeout(() => { setStepIdx(0); stepRef.current = 0 }, 420)
      return () => clearTimeout(tm)
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
    const els = [pillRef.current, titleRef.current, subtitleRef.current, actionsRef.current].filter(Boolean)
    if (!els.length || !footerWrapRef.current) return
    if (skipFooterAnim.current) {
      skipFooterAnim.current = false
      gsap.set(els, { clearProps: 'all' })
      return
    }
    const wrap = footerWrapRef.current
    const newH = wrap.offsetHeight
    if (prevFooterH.current !== null && Math.abs(prevFooterH.current - newH) > 1) {
      gsap.killTweensOf(wrap)
      gsap.set(wrap, { height: prevFooterH.current })
      gsap.to(wrap, { height: newH, duration: 0.40, ease: 'power3.inOut', onComplete: () => gsap.set(wrap, { clearProps: 'height' }) })
    }
    prevFooterH.current = null
    const fromY = isForwardRef.current ? 14 : -14
    gsap.killTweensOf(els)
    gsap.set(els, { y: fromY, autoAlpha: 0 })
    gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.34, stagger: 0.05, ease: 'power3.out', delay: 0.22, clearProps: 'transform,opacity,visibility' })
  }, [stepIdx])

  const goTo = useCallback((next) => {
    const prev = stepRef.current
    if (prev === next || animating.current) return
    const prevEl = slidesRef.current[prev]
    const nextEl = slidesRef.current[next]
    if (!prevEl || !nextEl) return
    animating.current = true
    stepRef.current = next
    const forward = next > prev
    isForwardRef.current = forward
    if (footerWrapRef.current) {
      gsap.killTweensOf(footerWrapRef.current)
      gsap.set(footerWrapRef.current, { clearProps: 'height' })
      prevFooterH.current = footerWrapRef.current.offsetHeight
    }
    gsap.set(nextEl, { xPercent: forward ? 100 : -100, autoAlpha: 1, pointerEvents: 'none' })
    const tl = gsap.timeline({
      onComplete() {
        gsap.set(prevEl, { autoAlpha: 0, xPercent: 0, pointerEvents: 'none' })
        gsap.set(nextEl, { pointerEvents: 'auto' })
        animating.current = false
      },
    })
    tl.to(prevEl, { xPercent: forward ? -22 : 22, autoAlpha: 0, duration: DUR_OUT, ease: 'power2.out' })
    tl.to(nextEl, { xPercent: 0, duration: DUR_IN, ease: 'expo.out' }, 0)
    setStepIdx(next)
  }, [])

  const handleBack = useCallback(() => {
    if (stepRef.current === 0) { onClose(); return }
    goTo(stepRef.current - 1)
  }, [goTo, onClose])

  const stepKey = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex h-full flex-col">
        <div className="relative flex items-center justify-center px-5 pt-5 pb-2 shrink-0">
          <button
            onClick={handleBack}
            className="absolute left-5 px-3.5 py-2.5 rounded-full bg-[#F5F5F7] text-black text-sm/[100%] font-medium active:bg-[#EBEBEB] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="flex items-center gap-1.5 text-black text-base/[100%] font-medium">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" opacity="0.5" />
            </svg>
            {t('vip.title')}
          </span>
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
                opacity: i === 0 ? 1 : 0,
                visibility: i === 0 ? 'visible' : 'hidden',
                pointerEvents: i === 0 ? 'auto' : 'none',
              }}
            >
              <StepComp isActive={stepIdx === i} />
            </div>
          ))}
        </div>

        <div
          ref={footerWrapRef}
          className="shrink-0 flex flex-col items-center text-center px-6 pt-2"
          style={{ paddingBottom: 'max(18px, calc(env(safe-area-inset-bottom) + 10px))' }}
        >
          <div ref={pillRef} className="px-4 py-1.5 rounded-full bg-[#F5F5F7] inline-block mb-3">
            <span className="text-black text-sm/[100%] font-medium">{t('hiw.step', { n: stepIdx + 1, total: STEPS.length })}</span>
          </div>
          <h2 ref={titleRef} className={`font-medium text-black mb-2 ${isCompact ? 'text-[20px]/[116%]' : 'text-[23px]/[116%]'}`}>
            {t(`vip.${stepKey}t`)}
          </h2>
          <p ref={subtitleRef} className="max-w-[300px] text-[13.5px]/[130%] font-medium text-[#8A8A8A] line-clamp-2">
            {t(`vip.${stepKey}s`)}
          </p>

          {/* Actions — sit right under the text */}
          <div ref={actionsRef} className="w-full mt-5">
            {isLast ? (
              <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
                <button
                  onClick={onClose}
                  className="py-3 rounded-full bg-[#F0F0F3] text-black text-[14px] font-[500] active:bg-[#E6E4EB] transition-colors"
                >
                  {t('vip.decline')}
                </button>
                <button
                  onClick={onContinue}
                  className="py-3 rounded-full text-white text-[14px] font-[500] active:scale-[0.98] transition-transform bg-[#E2319B]"
                >
                  {t('vip.continue')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => goTo(stepRef.current + 1)}
                className="w-full py-3 rounded-full text-white text-[14px] font-semibold active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(120deg, #C01A7E 0%, #E2319B 100%)', boxShadow: '0 8px 22px rgba(226,49,155,0.40)' }}
              >
                {t('hiw.next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalSheet>
  )
}
