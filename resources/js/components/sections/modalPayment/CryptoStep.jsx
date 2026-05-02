import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { THB_TO_RUB, CRYPTOS } from '@/constants/payments'
import { freezeHeight, animateHeightToContent } from '@/utils/gsapHeight'
const GRID_ITEMS = [...CRYPTOS, ...CRYPTOS, ...CRYPTOS, ...CRYPTOS]
const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11.6362 2.18164H9.16346C6.71959 2.18164 5.49766 2.18164 4.56423 2.65725C3.74316 3.0756 3.0756 3.74316 2.65725 4.56423C2.18164 5.49766 2.18164 6.71959 2.18164 9.16346V11.6362M8.21522 15.2725H11.7816C13.0036 15.2725 13.6145 15.2725 14.0813 15.0347C14.4918 14.8256 14.8256 14.4918 15.0347 14.0813C15.2725 13.6145 15.2725 13.0036 15.2725 11.7816V8.21522C15.2725 6.99329 15.2725 6.38232 15.0347 5.9156C14.8256 5.50507 14.4918 5.17129 14.0813 4.96211C13.6145 4.72431 13.0036 4.72431 11.7816 4.72431H8.21522C6.99329 4.72431 6.38232 4.72431 5.9156 4.96211C5.50507 5.17129 5.17129 5.50507 4.96211 5.9156C4.72431 6.38232 4.72431 6.99328 4.72431 8.21522V11.7816C4.72431 13.0036 4.72431 13.6145 4.96211 14.0813C5.17129 14.4918 5.50507 14.8256 5.9156 15.0347C6.38232 15.2725 6.99328 15.2725 8.21522 15.2725Z" stroke="#777779" strokeWidth="1.45455" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="#34C759" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export default function CryptoStep({ price, onBack, wrapRef, onPaymentConfirmed }) {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const detailsRef        = useRef(null)
  const copyIconRef       = useRef(null)
  const checkIconRef      = useRef(null)
  const copyTimerRef      = useRef(null)
  const confirmedTimerRef = useRef(null)
  const setCopyIconRef = useCallback((el) => {
    copyIconRef.current = el
    if (el) gsap.set(el, { autoAlpha: 1, scale: 1 })
  }, [])
  const setCheckIconRef = useCallback((el) => {
    checkIconRef.current = el
    if (el) gsap.set(el, { autoAlpha: 0, scale: 0.5 })
  }, [])
  const rubAmount      = Math.round(price * THB_TO_RUB)
  const selectedCrypto = selectedIdx !== null ? GRID_ITEMS[selectedIdx] : null
  const cryptoAmount   = selectedCrypto
    ? (price * selectedCrypto.rate).toFixed(selectedCrypto.decimals)
    : null
  useEffect(() => {
    if (selectedIdx !== null && detailsRef.current) {
      gsap.fromTo(
        detailsRef.current,
        { opacity: 0, y: 16, scale: 0.97, filter: 'blur(4px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.38, ease: 'power3.out', clearProps: 'filter,scale' },
      )
    }
  }, [selectedIdx])
  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current)
      confirmedTimerRef.current?.kill()
    }
  }, [])
  const resetCopyIcon = useCallback(() => {
    clearTimeout(copyTimerRef.current)
    confirmedTimerRef.current?.kill()
    const targets = [copyIconRef.current, checkIconRef.current].filter(Boolean)
    if (targets.length) gsap.killTweensOf(targets)
    if (copyIconRef.current)  gsap.set(copyIconRef.current,  { autoAlpha: 1, scale: 1 })
    if (checkIconRef.current) gsap.set(checkIconRef.current, { autoAlpha: 0, scale: 0.5 })
  }, [])
  const handleSelectCrypto = useCallback((i) => {
    resetCopyIcon()
    const wrapEl = wrapRef?.current
    if (selectedIdx === i) {
      if (!detailsRef.current || !wrapEl) { setSelectedIdx(null); return }
      freezeHeight(wrapEl)
      gsap.to(detailsRef.current, {
        opacity: 0, y: 10, scale: 0.97, duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          setSelectedIdx(null)
          animateHeightToContent(wrapEl, { duration: 0.32 })
        },
      })
    } else {
      if (wrapEl) {
        freezeHeight(wrapEl)
        setSelectedIdx(i)
        animateHeightToContent(wrapEl)
      } else {
        setSelectedIdx(i)
      }
    }
  }, [selectedIdx, wrapRef, resetCopyIcon])
  const handleCopy = useCallback(() => {
    if (!selectedCrypto) return
    navigator.clipboard.writeText(selectedCrypto.address).catch(() => {})
    clearTimeout(copyTimerRef.current)
    confirmedTimerRef.current?.kill()
    gsap.to(copyIconRef.current,  { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
    gsap.to(checkIconRef.current, { autoAlpha: 1, scale: 1,   duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    copyTimerRef.current = setTimeout(() => {
      gsap.to(checkIconRef.current, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
      gsap.to(copyIconRef.current,  { autoAlpha: 1, scale: 1,   duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    }, 2000)
    confirmedTimerRef.current = gsap.delayedCall(1, () => onPaymentConfirmed?.())
  }, [selectedCrypto, onPaymentConfirmed])
  return (
    <div className="flex flex-col gap-5 p-6 pt-2">
      <div className="flex flex-col items-center gap-1.5 text-center pt-1">
        <h2 className="text-black text-xl/[100%] font-semibold">Выберите криптовалюту</h2>
        <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
          Оплата подзаголовок. Оплата подзаголовок.
        </p>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {GRID_ITEMS.map((c, i) => {
          const isSelected = selectedIdx === i
          const isDimmed   = selectedIdx !== null && !isSelected
          return (
            <button
              key={`crypto-${i}`}
              onClick={() => handleSelectCrypto(i)}
              style={{ transition: 'opacity 0.2s ease' }}
              className={[
                'rounded-full aspect-square',
                isDimmed   ? 'opacity-35' : 'opacity-100',
                isSelected ? 'ring-2 ring-[#E2319B] ring-offset-1' : '',
              ].join(' ')}
            >
              <img src={c.icon} alt={c.name} width={40} height={40} loading="lazy" className="w-full h-full rounded-full object-cover" />
            </button>
          )
        })}
      </div>
      {selectedCrypto && (
        <div ref={detailsRef} className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[#7F7F7F] text-sm/[100%] font-medium">Переведите на адрес</span>
              <img src={selectedCrypto.icon} alt="" className="w-4 h-4 rounded-full object-cover" />
              <span className="text-[#7F7F7F] text-sm/[100%] font-medium">{selectedCrypto.fullName}</span>
            </div>
            <span className="text-black text-[28px]/[100%] font-semibold tracking-tight">
              {cryptoAmount} {selectedCrypto.unit}
            </span>
            <span className="text-[#7F7F7F] text-sm/[100%] font-medium">
              ~ {rubAmount.toLocaleString()}₽
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#F5F5F7] rounded-full p-3 min-w-0">
              <span className="block text-black text-sm/[100%] font-semibold truncate">
                {selectedCrypto.address}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 size-10 bg-[#F5F5F7] rounded-full flex items-center justify-center active:bg-[#ECEAEC] transition-colors"
            >
              <div className="relative w-[18px] h-[18px]">
                <div ref={setCopyIconRef}  className="absolute inset-0 flex items-center justify-center"><IconCopy /></div>
                <div ref={setCheckIconRef} className="absolute inset-0 flex items-center justify-center"><IconCheck /></div>
              </div>
            </button>
          </div>
          <p className="text-[#7F7F7F] text-xs/[150%] font-medium text-center">
            После завершения оплаты ваша встреча будет подтверждена.
          </p>
        </div>
      )}
      <button
        onClick={onBack}
        className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
      >
        Вернуться назад
      </button>
    </div>
  )
}