import { useRef, useCallback, useState, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import MainStep   from '@/components/sections/modalPayment/MainStep'
import CryptoStep from '@/components/sections/modalPayment/CryptoStep'
import SBPStep    from '@/components/sections/modalPayment/SBPStep'
const CheckCircle = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <circle cx="36" cy="36" r="36" fill="#34C759" />
    <path d="M22 36l10 10 18-20" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export default function PaymentSheet({ isOpen, onClose, onConfirmed, price = 0, currency = 'THB', cryptoOnly = false }) {
  const { t } = useTranslation()
  const [lazyCrypto, setLazyCrypto] = useState(false)
  const [lazySbp, setLazySbp]       = useState(false)
  const pendingSwitchRef            = useRef(null)
  const viewRefs          = useRef({})
  const contentWrapRef    = useRef(null)
  const currentViewRef    = useRef('main')
  const paymentSuccessRef = useRef(false)
  const successOverlayRef = useRef(null)
  const successIconRef    = useRef(null)
  const successTextRef    = useRef(null)
  const showPaymentSuccess = useCallback(() => {
    const overlay = successOverlayRef.current
    const icon    = successIconRef.current
    const text    = successTextRef.current
    if (!overlay) return
    gsap.set(overlay, { autoAlpha: 1 })
    gsap.set(icon,    { scale: 0, opacity: 0 })
    gsap.set(text,    { y: 14, opacity: 0 })
    gsap.timeline()
      .to(icon, { scale: 1, opacity: 1, duration: 0.52, ease: 'back.out(1.8)', clearProps: 'transform' })
      .to(text, { y: 0, opacity: 1, duration: 0.38, ease: 'power3.out', clearProps: 'transform' }, 0.16)
      .to({}, { duration: 1.4 })
      .to(icon, { y: -16, opacity: 0, duration: 0.3, ease: 'power2.in' })
      .to(text, { y: -16, opacity: 0, duration: 0.3, ease: 'power2.in' }, '-=0.18')
      .to(overlay, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, '-=0.14')
      .call(() => { paymentSuccessRef.current = true; onClose() })
  }, [onClose])
  const handleAfterClose = useCallback(() => {
    const { main, crypto, sbp } = viewRefs.current
    if (main)
      gsap.set(main, {
        position: 'relative', visibility: 'visible', opacity: 1,
        x: 0, y: 0, scale: 1, pointerEvents: 'auto',
        clearProps: 'filter,width,left,zIndex,willChange',
      })
    ;[crypto, sbp].forEach(el => {
      if (el)
        gsap.set(el, {
          position: 'absolute', top: 0, left: 0, right: 0,
          visibility: 'hidden', opacity: 0, x: 0, y: 0, scale: 1, pointerEvents: 'none',
          clearProps: 'filter,width,zIndex,willChange',
        })
    })
    if (contentWrapRef.current)    gsap.set(contentWrapRef.current,    { clearProps: 'height' })
    if (successOverlayRef.current) gsap.set(successOverlayRef.current, { autoAlpha: 0 })
    currentViewRef.current = 'main'
    pendingSwitchRef.current = null
    setLazyCrypto(false)
    setLazySbp(false)
    if (paymentSuccessRef.current) {
      paymentSuccessRef.current = false
      onConfirmed?.()
    }
  }, [onConfirmed])
  const switchView = useCallback((next) => {
    const prev = currentViewRef.current
    if (prev === next) return
    const prevEl = viewRefs.current[prev]
    const currEl = viewRefs.current[next]
    const wrapEl = contentWrapRef.current
    if (!prevEl || !currEl || !wrapEl) return
    currentViewRef.current = next
    const forward = next !== 'main'
    gsap.killTweensOf([prevEl, currEl, wrapEl])
    const currentHeight = wrapEl.offsetHeight
    gsap.set(wrapEl, { height: currentHeight })
    const prevElLeft  = prevEl.offsetLeft
    const prevElWidth = prevEl.offsetWidth
    gsap.set(currEl, {
      position: 'absolute', top: 0, left: prevElLeft, width: prevElWidth,
      visibility: 'visible', opacity: 0, x: 0, y: 0, scale: 1,
      pointerEvents: 'none', zIndex: -1, clearProps: 'filter',
    })
    const newHeight = currEl.offsetHeight
    gsap.to(wrapEl, {
      height: newHeight, duration: 0.46, ease: 'power3.inOut',
      onComplete: () => gsap.set(wrapEl, { clearProps: 'height' }),
    })
    gsap.set(prevEl, {
      position: 'absolute', top: 0, left: prevElLeft, width: prevElWidth,
      zIndex: 0, willChange: 'transform,opacity', pointerEvents: 'none',
    })
    gsap.to(prevEl, {
      opacity: 0, y: forward ? 22 : -22, scale: 0.988,
      duration: 0.28, ease: 'power2.in',
      onComplete: () =>
        gsap.set(prevEl, {
          visibility: 'hidden', opacity: 0, x: 0, y: 0, scale: 1, pointerEvents: 'none',
          zIndex: 0, position: 'absolute', top: 0, left: 0, right: 0,
          clearProps: 'filter,width,willChange',
        }),
    })
    const stepRoot    = currEl.children[0]
    const innerBlocks = stepRoot
      ? Array.from(stepRoot.children).filter(el => el.tagName !== 'STYLE')
      : []
    gsap.killTweensOf(innerBlocks)
    gsap.set(innerBlocks, { autoAlpha: 0, y: forward ? -20 : 20 })
    gsap.set(currEl, {
      position: 'relative', visibility: 'visible', zIndex: 1,
      pointerEvents: 'none', opacity: 1,
      x: 0, y: forward ? -32 : 32, scale: 0.97,
      clearProps: 'width,left',
    })
    gsap.to(currEl, {
      y: 0, scale: 1, duration: 0.34, ease: 'power3.out',
      onComplete: () =>
        gsap.set(currEl, { clearProps: 'y,scale,zIndex,willChange', pointerEvents: 'auto' }),
    })
    gsap.to(innerBlocks, {
      autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.1, ease: 'power3.out', delay: 0.1,
      onComplete: () => gsap.set(innerBlocks, { clearProps: 'opacity,visibility,y' }),
    })
  }, [])

  useLayoutEffect(() => {
    const p = pendingSwitchRef.current
    if (!p) return
    const ready =
      (p === 'crypto' && viewRefs.current.crypto) ||
      (p === 'sbp' && viewRefs.current.sbp)
    if (!ready) return
    pendingSwitchRef.current = null
    switchView(p)
  }, [lazyCrypto, lazySbp, switchView])

  const goCrypto = useCallback(() => {
    if (!lazyCrypto) {
      pendingSwitchRef.current = 'crypto'
      setLazyCrypto(true)
    } else {
      switchView('crypto')
    }
  }, [lazyCrypto, switchView])

  const goSbp = useCallback(() => {
    if (!lazySbp) {
      pendingSwitchRef.current = 'sbp'
      setLazySbp(true)
    } else {
      switchView('sbp')
    }
  }, [lazySbp, switchView])

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose} onAfterClose={handleAfterClose}>
      <div ref={contentWrapRef} style={{ position: 'relative', overflow: 'hidden' }}>
        {cryptoOnly ? (
          // Lead payment: open straight into crypto (coins + address), no method
          // chooser, no SBP. "Back" just closes the sheet.
          <CryptoStep price={price} onBack={onClose} wrapRef={contentWrapRef} onPaymentConfirmed={showPaymentSuccess} />
        ) : (
          <>
        <div ref={(el) => { viewRefs.current.main = el }} style={{ position: 'relative' }}>
          <MainStep price={price} currency={currency} onCrypto={goCrypto} onSBP={goSbp} />
        </div>
        {lazyCrypto && (
          <div
            ref={(el) => { viewRefs.current.crypto = el }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
          >
            <CryptoStep price={price} onBack={() => switchView('main')} wrapRef={contentWrapRef} onPaymentConfirmed={showPaymentSuccess} />
          </div>
        )}
        {lazySbp && (
          <div
            ref={(el) => { viewRefs.current.sbp = el }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
          >
            <SBPStep onBack={() => switchView('main')} />
          </div>
        )}
          </>
        )}
        <div
          ref={successOverlayRef}
          className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4 px-6 py-14"
          style={{ visibility: 'hidden', opacity: 0 }}
        >
          <div ref={successIconRef}>
            <CheckCircle />
          </div>
          <div ref={successTextRef} className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-black text-xl/[100%] font-semibold">{t('payment.success')}</p>
            <p className="text-[#7F7F7F] text-sm/[140%]">{t('payment.successSub')}</p>
          </div>
        </div>
      </div>
    </ModalMiddle>
  )
}