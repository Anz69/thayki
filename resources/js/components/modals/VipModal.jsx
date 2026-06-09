import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import VipStep from '@/components/sections/vip/VipStep'
import { useCompactMode } from '@/composables/useCompactMode'
import { useTranslation } from 'react-i18next'

const STEPS = ['s1', 's2']
const VARIANTS = ['gem', 'lock']
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
  const [design, setDesign] = useState('glow') // 'glow' | 'lux' — temporary chooser
  const isCompact = useCompactMode()
  const slidesRef = useRef([])
  const stepRef = useRef(0)
  const animating = useRef(false)
  const footerWrapRef = useRef(null)
  const pillRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
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
    const els = [pillRef.current, titleRef.current, subtitleRef.current].filter(Boolean)
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

  const handleNext = useCallback(() => {
    if (stepRef.current === STEPS.length - 1) { onContinue?.(); return }
    goTo(stepRef.current + 1)
  }, [goTo, onContinue])

  const stepKey = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

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
          <span className="flex items-center gap-1.5 text-black text-base/[100%] font-medium">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#161616" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            {t('vip.title')}
          </span>
          {isLast ? (
            <button
              onClick={handleNext}
              className="px-3.5 py-3 rounded-full text-white text-sm/[100%] font-semibold active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(120deg, #C01A7E 0%, #E2319B 100%)', boxShadow: '0 4px 14px rgba(226,49,155,0.4)' }}
            >
              {t('vip.continue')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-2.5 py-3 rounded-full bg-[#F5F5F7] text-black text-sm/[100%] font-medium active:bg-[#EBEBEB] transition-colors"
            >
              {t('hiw.next')}
            </button>
          )}
        </div>

        {/* TEMP: style chooser — pick one and tell me, I'll remove this. */}
        <div className="flex justify-center pt-1 pb-2 shrink-0">
          <div className="inline-flex bg-[#F0F0F3] rounded-full p-0.5">
            {[['glow', 'Стиль 1'], ['lux', 'Стиль 2']].map(([d, label]) => (
              <button
                key={d}
                onClick={() => setDesign(d)}
                className={[
                  'px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors',
                  design === d ? 'bg-white text-black shadow-sm' : 'text-[#8B8A92]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {STEPS.map((s, i) => (
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
              <VipStep isActive={stepIdx === i} variant={VARIANTS[i]} design={design} />
            </div>
          ))}
        </div>

        <div ref={footerWrapRef} className={`shrink-0 overflow-hidden flex items-start justify-start ${isCompact ? 'min-h-[180px] pt-2' : 'min-h-[224px] pt-3'}`}>
          <div className="flex flex-col items-center w-full text-center px-6">
            <div ref={pillRef} className={`px-4 py-1.5 rounded-full bg-[#F5F5F7] inline-block ${isCompact ? 'mb-3' : 'mb-4'}`}>
              <span className="text-black text-sm/[100%] font-medium">{t('hiw.step', { n: stepIdx + 1, total: STEPS.length })}</span>
            </div>
            <h2 ref={titleRef} className={`font-medium text-black mb-2.5 ${isCompact ? 'text-[20px]/[116%]' : 'text-[24px]/[116%]'}`}>
              {t(`vip.${stepKey}t`)}
            </h2>
            <p ref={subtitleRef} className="max-w-[300px] text-[14px]/[130%] font-medium text-[#8A8A8A] line-clamp-2">
              {t(`vip.${stepKey}s`)}
            </p>
          </div>
        </div>
      </div>
    </ModalSheet>
  )
}
