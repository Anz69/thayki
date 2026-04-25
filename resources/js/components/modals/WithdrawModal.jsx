import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'

const METHOD_META = {
  usdt: { label: 'USDT', hint: 'TRC20', icon: 'U' },
  btc: { label: 'BTC', hint: 'Bitcoin', icon: 'B' },
  ton: { label: 'TON', hint: 'TON', icon: 'T' },
}

const DEFAULT_METHODS = ['usdt', 'btc', 'ton']

export default function WithdrawModal({ isOpen, onClose, balance = 0, methods = DEFAULT_METHODS }) {
  const [amount, setAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const viewRefs = useRef({})
  const contentWrapRef = useRef(null)
  const currentViewRef = useRef('amount')
  const amountBtnsRef = useRef(null)

  const availableMethods = useMemo(() => {
    const normalized = (methods ?? [])
      .map((method) => {
        if (typeof method === 'string') {
          return {
            value: method,
            label: METHOD_META[method]?.label ?? method.toUpperCase(),
            hint: METHOD_META[method]?.hint ?? '',
            icon: METHOD_META[method]?.icon ?? method[0]?.toUpperCase() ?? '?',
          }
        }
        const value = method?.value
        if (!value) return null
        return {
          value,
          label: method?.label ?? METHOD_META[value]?.label ?? value.toUpperCase(),
          hint: method?.hint ?? METHOD_META[value]?.hint ?? '',
          icon: method?.icon ?? METHOD_META[value]?.icon ?? value[0]?.toUpperCase() ?? '?',
        }
      })
      .filter(Boolean)
    return normalized.length ? normalized : DEFAULT_METHODS.map((value) => ({
      value,
      label: METHOD_META[value].label,
      hint: METHOD_META[value].hint,
      icon: METHOD_META[value].icon,
    }))
  }, [methods])

  const numAmount = Number(amount || 0)
  const amountMinor = Math.round(numAmount * 100)
  const hasAmount = numAmount > 0
  const amountOver = numAmount > balance
  const detailsValid = hasAmount && !!selectedMethod && walletAddress.trim().length > 3

  useEffect(() => {
    if (!selectedMethod || !availableMethods.some(m => m.value === selectedMethod)) {
      setSelectedMethod(availableMethods[0]?.value ?? null)
    }
  }, [availableMethods, selectedMethod])

  useEffect(() => {
    const el = amountBtnsRef.current
    if (!el) return

    gsap.killTweensOf(el)
    gsap.killTweensOf(el.children)

    if (!hasAmount) {
      if (!isOpen) {
        gsap.set(el, { display: 'none', height: 0, opacity: 0, marginTop: -12 })
        return
      }

      if (el.offsetHeight <= 0) {
        gsap.set(el, { display: 'none', height: 0, opacity: 0, marginTop: -12 })
        return
      }

      gsap.set(el, { display: 'flex', overflow: 'hidden' })
      gsap.to(el, {
        height: 0,
        opacity: 0,
        marginTop: -12,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => gsap.set(el, { display: 'none' }),
      })
      return
    }

    gsap.set(el, { display: 'flex', overflow: 'hidden', height: 'auto' })
    const h = el.scrollHeight
    gsap.fromTo(el,
      { height: 0, opacity: 0, marginTop: -12 },
      {
        height: h,
        opacity: 1,
        marginTop: 0,
        duration: 0.4,
        ease: 'power3.out',
        onComplete: () => gsap.set(el, { clearProps: 'height,overflow,opacity,marginTop' }),
      })
    gsap.fromTo(el.children,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.32, stagger: 0.06, ease: 'power3.out' })
  }, [hasAmount, isOpen])

  const switchView = useCallback((next) => {
    const prev = currentViewRef.current
    if (prev === next) return
    const prevEl = viewRefs.current[prev]
    const currEl = viewRefs.current[next]
    const wrapEl = contentWrapRef.current
    if (!prevEl || !currEl || !wrapEl) return

    currentViewRef.current = next
    const forward = next === 'details' || next === 'done'

    gsap.killTweensOf([prevEl, currEl, wrapEl])
    gsap.set(wrapEl, { height: wrapEl.offsetHeight })

    const prevElLeft = prevEl.offsetLeft
    const prevElWidth = prevEl.offsetWidth
    gsap.set(currEl, {
      position: 'absolute',
      top: 0,
      left: prevElLeft,
      width: prevElWidth,
      visibility: 'visible',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: -1,
      y: forward ? -28 : 28,
      scale: 0.97,
    })

    gsap.to(wrapEl, {
      height: currEl.offsetHeight,
      duration: 0.44,
      ease: 'power3.inOut',
      onComplete: () => gsap.set(wrapEl, { clearProps: 'height' }),
    })

    gsap.set(prevEl, {
      position: 'absolute',
      top: 0,
      left: prevElLeft,
      width: prevElWidth,
      zIndex: 0,
      pointerEvents: 'none',
    })
    gsap.to(prevEl, {
      opacity: 0,
      y: forward ? 22 : -22,
      scale: 0.988,
      duration: 0.26,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(prevEl, {
          visibility: 'hidden',
          opacity: 0,
          x: 0,
          y: 0,
          scale: 1,
          pointerEvents: 'none',
          zIndex: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          clearProps: 'width',
        })
      },
    })

    gsap.set(currEl, {
      position: 'relative',
      visibility: 'visible',
      zIndex: 1,
      opacity: 1,
      pointerEvents: 'none',
      clearProps: 'width,left',
    })
    gsap.to(currEl, {
      y: 0,
      scale: 1,
      duration: 0.34,
      ease: 'power3.out',
      onComplete: () => gsap.set(currEl, { clearProps: 'y,scale,zIndex', pointerEvents: 'auto' }),
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!detailsValid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/withdrawals', {
        amount_minor: amountMinor,
        method: selectedMethod,
        wallet_address: walletAddress.trim(),
      }, {
        headers: { 'Idempotency-Key': `withdraw-${Date.now()}-${amountMinor}` },
      })
      switchView('done')
    } catch (err) {
      const code = err?.response?.data?.error?.code
      const raw = err?.response?.data?.error?.message
      const friendly = code === 'INSUFFICIENT_FUNDS'
        ? 'Недостаточно средств на балансе'
        : code === 'WITHDRAWAL_MIN_AMOUNT'
          ? 'Сумма меньше минимально допустимой'
          : code === 'WITHDRAWAL_FORBIDDEN'
            ? 'Вывод доступен только для моделей'
            : code === 'WITHDRAWAL_METHOD_NOT_ALLOWED'
              ? 'Этот способ вывода сейчас недоступен'
              : raw || 'Не удалось создать заявку. Попробуйте ещё раз.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }, [detailsValid, submitting, amountMinor, selectedMethod, walletAddress, switchView])

  const handleAfterClose = useCallback(() => {
    const { amount: amountEl, details: detailsEl, done: doneEl } = viewRefs.current
    const reset = (el, isVisible) => {
      if (!el) return
      gsap.set(el, isVisible
        ? {
            position: 'relative',
            visibility: 'visible',
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            pointerEvents: 'auto',
            clearProps: 'width,left,zIndex',
          }
        : {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            visibility: 'hidden',
            opacity: 0,
            x: 0,
            y: 0,
            scale: 1,
            pointerEvents: 'none',
            clearProps: 'width,zIndex',
          })
    }
    reset(amountEl, true)
    reset(detailsEl, false)
    reset(doneEl, false)
    if (contentWrapRef.current) gsap.set(contentWrapRef.current, { clearProps: 'height' })
    if (amountBtnsRef.current) gsap.set(amountBtnsRef.current, { display: 'none', height: 0, opacity: 0, marginTop: -12 })
    currentViewRef.current = 'amount'
    setAmount('')
    setWalletAddress('')
    setError('')
    setSubmitting(false)
  }, [])

  const displayAmount = amount ? `฿ ${amount}` : ''

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose} onAfterClose={handleAfterClose}>
      <div ref={contentWrapRef} style={{ position: 'relative', overflow: 'hidden' }}>
        <div ref={(el) => { viewRefs.current.amount = el }} style={{ position: 'relative' }}>
          <div className="flex flex-col gap-5 px-5 pt-2 pb-6 bg-white">
            <div className="flex flex-col items-center gap-1.5 text-center pt-1">
              <h2 className="text-black text-xl/[100%] font-semibold">Заявка на вывод</h2>
              <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
                Укажите сумму, затем выберите криптовалюту и кошелек.
              </p>
            </div>

            <div className="bg-[#F5F5F7] rounded-2xl px-5 py-5">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Укажите сумму вывода"
                value={displayAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^฿\s*/, '').replace(/[^0-9]/g, '')
                  setAmount(raw)
                }}
                className="w-full bg-transparent text-black text-lg/[100%] font-semibold outline-none placeholder:text-[#ABABAB] placeholder:font-medium"
              />
       
            </div>

            <div
              ref={amountBtnsRef}
              className="flex flex-col gap-3"
              style={{ display: 'none', height: 0, opacity: 0, marginTop: -12 }}
            >
              <button
                onClick={() => switchView('details')}
                disabled={!hasAmount}
                className={[
                  'w-full py-4 rounded-full text-base/[100%] font-semibold transition-opacity',
                  hasAmount ? 'bg-[#E2319B] text-white active:opacity-80' : 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed',
                ].join(' ')}
              >
                Далее
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
              >
                Вернуться назад
              </button>
            </div>
          </div>
        </div>

        <div
          ref={(el) => { viewRefs.current.details = el }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        >
          <div className="flex flex-col gap-4 px-5 pt-2 pb-6 bg-white">
            <div className="flex flex-col gap-1.5 text-center">
              <h2 className="text-black text-xl/[100%] font-semibold">Выбор крипты и кошелька</h2>
              <p className="text-[#7F7F7F] text-sm/[140%] font-medium">Сумма вывода: ฿ {numAmount.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {availableMethods.map((method) => {
                const active = selectedMethod === method.value
                return (
                  <button
                    key={method.value}
                    onClick={() => setSelectedMethod(method.value)}
                    className={[
                      'rounded-2xl px-3 py-3.5 border transition-colors text-left',
                      active ? 'border-[#E2319B] bg-[#FFF2FA]' : 'border-[#ECEAEC] bg-[#F5F5F7] active:bg-[#ECEAEC]',
                    ].join(' ')}
                  >
                 
                    <p className="text-black text-sm/[100%] font-semibold">{method.label}</p>
                    <p className="text-[#7F7F7F] text-[11px]/[120%] font-medium mt-1">{method.hint}</p>
                  </button>
                )
              })}
            </div>

            <div className="bg-[#F5F5F7] rounded-2xl px-5 py-5">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Введите адрес кошелька"
                className="w-full bg-transparent text-black text-base/[100%] font-medium outline-none placeholder:text-[#ABABAB]"
              />
            </div>

            {amountOver && (
              <p className="text-[#E2319B] text-sm/[130%] font-medium text-center">
                Недостаточно средств на балансе
              </p>
            )}
            {!!error && (
              <p className="text-[#E2319B] text-sm/[130%] font-medium text-center">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={!detailsValid || submitting || amountOver}
                className={[
                  'w-full py-4 rounded-full text-base/[100%] font-semibold transition-opacity',
                  (!detailsValid || submitting || amountOver)
                    ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                    : 'bg-[#E2319B] text-white active:opacity-80',
                ].join(' ')}
              >
                {submitting ? 'Отправляем...' : 'Оставить заявку'}
              </button>
              <button
                onClick={() => switchView('amount')}
                disabled={submitting}
                className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
              >
                Назад
              </button>
            </div>
          </div>
        </div>

        <div
          ref={(el) => { viewRefs.current.done = el }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-5 px-5 py-6 text-center bg-white">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-black text-xl/[100%] font-semibold">Заявка на вывод создана</h2>
              <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
                Скоро проверим заявку и обработаем вывод.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </ModalMiddle>
  )
}